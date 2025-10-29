import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  proto,
  WAMessage,
  AuthenticationState,
  initAuthCreds,
  SignalDataTypeMap,
  BufferJSON,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import { Boom } from "@hapi/boom";
import { logger } from "../utils/logger";
import { sessionService } from "./sessionService";
import { messageService } from "./messageService";
import { socketService } from "./socketService";
import { BaileysSession } from "../types";
import * as crypto from "crypto";
import { contentService, ContentType } from "../content";
import { pluginManager } from "../plugins";

class WhatsAppService {
  private sessions: Map<string, BaileysSession> = new Map();
  private retryAttempts: Map<string, number> = new Map();
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private encryptionKey: Buffer;

  constructor() {
    // Initialize encryption key from environment or generate one
    const secret = process.env.AUTH_SECRET || "default-secret-key";
    this.encryptionKey = crypto.scryptSync(secret, "salt", 32);

    // Initialize plugin manager
    this.initializePluginManager().catch((error) => {
      logger.error(
        "Failed to initialize plugin manager in constructor:",
        error
      );
    });
  }

  private async initializePluginManager(): Promise<void> {
    try {
      await pluginManager.initialize();
      logger.info("Plugin manager initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize plugin manager:", error);
    }
  }

  // Enhanced encryption method with BufferJSON support
  private encrypt(data: any): Buffer {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.encryptionKey, iv);

    const dataString = JSON.stringify(data, BufferJSON.replacer);

    const encrypted = Buffer.concat([
      cipher.update(dataString),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]);
  }

  // Enhanced decryption method with BufferJSON support
  private decrypt(encryptedData: Buffer): any {
    try {
      const iv = encryptedData.subarray(0, 16);
      const authTag = encryptedData.subarray(16, 32);
      const encryptedContent = encryptedData.subarray(32);

      const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        this.encryptionKey,
        iv
      );

      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(encryptedContent),
        decipher.final(),
      ]);

      return JSON.parse(decrypted.toString(), BufferJSON.reviver);
    } catch (error) {
      logger.error("Failed to decrypt auth state:", error);
      return null;
    }
  }

  // Comprehensive authentication state management
  private async loadAuthState(sessionId: string): Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
  }> {
    const savedCreds = await sessionService.getSessionCreds(sessionId);

    let creds = initAuthCreds();
    let keys: any = {};

    if (savedCreds) {
      try {
        // Try to parse as enhanced encrypted format first
        const encryptedBuffer = Buffer.from(savedCreds, "base64");
        const decryptedData = this.decrypt(encryptedBuffer);

        if (decryptedData && decryptedData.creds && decryptedData.keys) {
          creds = decryptedData.creds;
          keys = decryptedData.keys;
        } else {
          // Fallback to old JSON format
          const oldData = JSON.parse(savedCreds);
          if (oldData.creds) {
            creds = oldData.creds;
            keys = oldData.keys || {};
          } else {
            // Very old format - just the creds
            creds = oldData;
          }
        }
      } catch (error) {
        logger.warn(
          `Failed to parse saved credentials for session ${sessionId}, using fresh creds:`,
          error
        );
        creds = initAuthCreds();
        keys = {};
      }
    }

    return {
      state: {
        creds,
        keys: {
          get: async (type: keyof SignalDataTypeMap, ids: string[]) => {
            const data = keys[type];
            return ids.reduce((dict: any, id) => {
              if (data?.[id]) dict[id] = data[id];
              return dict;
            }, {});
          },
          set: async (data: any) => {
            for (const type in data) {
              keys[type] = keys[type] || {};
              Object.assign(keys[type], data[type]);
            }
            await this.saveAuthState(sessionId, creds, keys);
          },
        },
      },
      saveCreds: async () => {
        await this.saveAuthState(sessionId, creds, keys);
      },
    };
  }

  // Save authentication state with enhanced encryption
  private async saveAuthState(
    sessionId: string,
    creds: any,
    keys: any
  ): Promise<void> {
    try {
      const authData = { creds, keys };
      const encryptedData = this.encrypt(authData);
      const base64Data = encryptedData.toString("base64");

      await sessionService.saveSessionCreds(sessionId, base64Data);
    } catch (error) {
      logger.error(
        `Failed to save auth state for session ${sessionId}:`,
        error
      );
      throw error;
    }
  }

  async createSession(
    sessionId: string,
    userId: string,
    phoneNumber?: string
  ): Promise<string> {
    try {
      if (this.sessions.has(sessionId)) {
        logger.warn(
          `Session ${sessionId} already exists, returning existing session`
        );
        const existingSession = this.sessions.get(sessionId);
        if (existingSession?.status === "connected") {
          return "Session already active";
        }
        // If session exists but not connected, continue with reconnection
        this.sessions.delete(sessionId);
      }

      // Reset retry attempts for new session
      this.retryAttempts.set(sessionId, 0);

      // Initialize session
      const session: BaileysSession = {
        sock: null,
        status: "pending",
      };

      this.sessions.set(sessionId, session);

      // Create auth state using enhanced method
      logger.info(`Loading auth state for session: ${sessionId}`);
      const { state, saveCreds } = await this.loadAuthState(sessionId);
      logger.info(`Auth state loaded successfully for session: ${sessionId}`);

      // Create a minimal logger that satisfies Baileys requirements
      const baileysLogger = {
        level: "silent",
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        fatal: () => {},
        child: () => baileysLogger,
        silent: true,
      };

      // Create WhatsApp socket with enhanced configuration
      logger.info(`Creating WhatsApp socket for session: ${sessionId}`);

      // Get latest Baileys version for better compatibility
      const { version, isLatest } = await fetchLatestBaileysVersion();
      logger.info(
        `Using Baileys version: ${version.join(".")}, isLatest: ${isLatest}`
      );

      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: baileysLogger,
        browser: ["WixTron Beta", "Safari (linux)", "1.0.0"],
        defaultQueryTimeoutMs: 60000,
        qrTimeout: 40000,
        markOnlineOnConnect: true,
        keepAliveIntervalMs: 30000,
        emitOwnEvents: true,
        connectTimeoutMs: 60000,
        generateHighQualityLinkPreview: false,
        version,
        syncFullHistory: false,
      });
      logger.info(`WhatsApp socket created for session: ${sessionId}`);

      session.sock = sock;

      // Handle connection updates
      sock.ev.on("connection.update", async (update) => {
        try {
          const { connection, lastDisconnect, qr, isNewLogin } = update;

          if (qr) {
            if (phoneNumber) {
              // If phone number is provided, request pairing code instead of QR
              try {
                const code = await sock.requestPairingCode(phoneNumber);
                session.pairingCode = code;
                session.status = "pending";

                logger.info(
                  `Pairing code generated for ${phoneNumber}: ${code}`
                );

                // Save pairing code to database
                const updateResult = await sessionService.updateSession(
                  sessionId,
                  {
                    pairingCode: code,
                    phoneNumber: phoneNumber,
                    status: "PENDING",
                  }
                );

                if (!updateResult) {
                  logger.warn(
                    `Session ${sessionId} not found in database, cleaning up memory session`
                  );
                  this.sessions.delete(sessionId);
                  return "Session was deleted";
                }

                // Emit pairing code via Socket.IO
                socketService.emitPairingCode(
                  sessionId,
                  userId,
                  code,
                  phoneNumber
                );
              } catch (pairingError) {
                logger.error(
                  `Failed to request pairing code for ${phoneNumber}:`,
                  pairingError
                );
                session.status = "error";
                socketService.emitError(
                  sessionId,
                  userId,
                  "Failed to generate pairing code"
                );
              }
            } else {
              // Fallback to QR code if no phone number provided
              session.qr = await QRCode.toDataURL(qr);
              session.status = "pending";

              // Save QR to database
              const updateResult = await sessionService.updateSession(
                sessionId,
                {
                  qrCode: session.qr,
                  status: "PENDING",
                }
              );

              if (!updateResult) {
                logger.warn(
                  `Session ${sessionId} not found in database, cleaning up memory session`
                );
                this.sessions.delete(sessionId);
                return "Session was deleted";
              }

              // Emit QR code via Socket.IO
              socketService.emitQRCode(sessionId, userId, session.qr);
            }
          }

          if (connection === "close") {
            const shouldReconnect =
              (lastDisconnect?.error as Boom)?.output?.statusCode !==
              DisconnectReason.loggedOut;

            if (shouldReconnect) {
              const currentRetries = this.retryAttempts.get(sessionId) || 0;

              if (currentRetries < this.MAX_RETRY_ATTEMPTS) {
                this.retryAttempts.set(sessionId, currentRetries + 1);
                logger.info(
                  `Reconnecting session: ${sessionId} (attempt ${
                    currentRetries + 1
                  }/${this.MAX_RETRY_ATTEMPTS})`
                );

                try {
                  await this.createSession(sessionId, userId);
                } catch (reconnectError) {
                  logger.error(
                    `Failed to reconnect session ${sessionId}:`,
                    reconnectError
                  );

                  // If this was the last retry attempt, give up
                  if (currentRetries + 1 >= this.MAX_RETRY_ATTEMPTS) {
                    logger.warn(
                      `Max retry attempts (${this.MAX_RETRY_ATTEMPTS}) reached for session ${sessionId}, giving up`
                    );
                    this.sessions.delete(sessionId);
                    this.retryAttempts.delete(sessionId);

                    const updateResult = await sessionService.updateSession(
                      sessionId,
                      {
                        status: "DISCONNECTED",
                      }
                    );

                    if (updateResult) {
                      socketService.emitSessionStatus(
                        sessionId,
                        userId,
                        "disconnected",
                        {
                          reason: "max_retries_exceeded",
                        }
                      );
                    }
                  }
                }
              } else {
                logger.warn(
                  `Max retry attempts (${this.MAX_RETRY_ATTEMPTS}) already reached for session ${sessionId}, not reconnecting`
                );
                this.sessions.delete(sessionId);
                this.retryAttempts.delete(sessionId);

                const updateResult = await sessionService.updateSession(
                  sessionId,
                  {
                    status: "DISCONNECTED",
                  }
                );

                if (updateResult) {
                  socketService.emitSessionStatus(
                    sessionId,
                    userId,
                    "disconnected",
                    {
                      reason: "max_retries_exceeded",
                    }
                  );
                }
              }
            } else {
              logger.info("Session logged out:", sessionId);
              this.sessions.delete(sessionId);
              this.retryAttempts.delete(sessionId);

              const updateResult = await sessionService.updateSession(
                sessionId,
                {
                  status: "DISCONNECTED",
                }
              );

              if (updateResult) {
                // Emit session status update only if session still exists in DB
                socketService.emitSessionStatus(
                  sessionId,
                  userId,
                  "disconnected",
                  {
                    reason: "logged_out",
                  }
                );
              }
            }
          }
          if (connection === "connecting") {
            session.status = "connecting";
            socketService.emitSessionStatus(sessionId, userId, "connecting");
          } else if (connection === "open") {
            logger.info(`Session successfully connected: ${sessionId}`);
            session.status = "connected";

            const phoneNumber = sock.user?.id.split(":")[0];
            const updateResult = await sessionService.updateSession(sessionId, {
              status: "CONNECTED",
              phoneNumber: phoneNumber,
              qrCode: null,
              lastSeen: new Date(),
            });

            if (updateResult) {
              // Reset retry attempts on successful connection
              this.retryAttempts.delete(sessionId);

              // Emit session status update only if session still exists in DB
              socketService.emitSessionStatus(sessionId, userId, "connected", {
                phoneNumber: phoneNumber,
              });
            } else {
              logger.warn(
                `Session ${sessionId} not found in database during connection, cleaning up`
              );
              this.sessions.delete(sessionId);
              this.retryAttempts.delete(sessionId);
              return "Session was deleted";
            }

            // Save credentials using enhanced method
            try {
              logger.info(`Saving credentials for session: ${sessionId}`);
              await saveCreds();
              logger.info(
                `Credentials saved successfully for session: ${sessionId}`
              );
            } catch (credError) {
              logger.error(
                `Failed to save session credentials for ${sessionId}:`,
                credError
              );
            }

            // Send welcome content on first connection
            await this.restoreSessions();

            try {
              logger.info(`Sending welcome content for session: ${sessionId}`);
              const botStats = await contentService.getBotStats();
              await contentService.sendWelcomeContent(sessionId, userId, {
                botStats,
                userContext: { phoneNumber: phoneNumber },
              });
              logger.info(`Welcome content sent for session: ${sessionId}`);
            } catch (welcomeError) {
              logger.error(
                `Failed to send welcome content for ${sessionId}:`,
                welcomeError
              );
            }
          }
        } catch (updateError) {
          logger.error(
            `Critical error in connection update handler for session ${sessionId}:`,
            updateError
          );
          // Clean up session on critical errors
          this.sessions.delete(sessionId);
          this.retryAttempts.delete(sessionId);
        }
      });

      // Handle messages with error boundary
      sock.ev.on("messages.upsert", async (m) => {
        try {
          const message = m.messages[0];
          if (message.key.fromMe) {
            logger.info(`Received message from ${message.key.remoteJid}`);
            // Save message to database
            // await this.saveMessageToDb(sessionId, message);

            // Emit new message via Socket.IO
            socketService.emitNewMessage(sessionId, userId, {
              messageId: message.key.id,
              fromMe: message.key.fromMe || false,
              remoteJid: message.key.remoteJid,
              content:
                message.message?.conversation ||
                message.message?.extendedTextMessage?.text ||
                message.message?.imageMessage?.caption ||
                "",
              timestamp: new Date(Number(message.messageTimestamp!) * 1000),
            });

            // Handle content commands and auto-reply if configured and not from self
            if (message.key.fromMe) {
              const messageText =
                message.message?.conversation ||
                message.message?.extendedTextMessage?.text ||
                "";

              // Only process if it's a command (starts with .)
              if (messageText && messageText.trim().startsWith(".")) {
                logger.info(
                  `Processing command: ${messageText.trim()} from ${
                    message.key.remoteJid
                  }`
                );

                // Add loading reaction immediately
                let loadingReactionSent = false;
                try {
                  await sock.sendMessage(message.key.remoteJid, {
                    react: { text: "⏳", key: message.key },
                  });
                  loadingReactionSent = true;
                } catch (reactionError) {
                  logger.warn(
                    `Failed to send loading reaction: ${reactionError}`
                  );
                }

                try {
                  // Handle content commands first
                  const contentHandled = await this.handleContentCommands(
                    sock,
                    message,
                    messageText.trim(),
                    sessionId,
                    userId
                  );

                  // Handle plugin commands if content command wasn't handled
                  if (!contentHandled) {
                    await this.handlePluginCommands(
                      sock,
                      message,
                      messageText.trim(),
                      sessionId,
                      userId
                    );
                  }
                } finally {
                  // Remove loading reaction after command processing
                  if (loadingReactionSent) {
                    try {
                      await sock.sendMessage(message.key.remoteJid, {
                        react: { text: "", key: message.key },
                      });
                    } catch (removeReactionError) {
                      logger.warn(
                        `Failed to remove loading reaction: ${removeReactionError}`
                      );
                    }
                  }
                }
              }

              // Then handle auto-reply if configured
              try {
                const botConfig = await sessionService.getBotConfig(sessionId);
                if (
                  botConfig?.autoReply &&
                  botConfig.autoReplyMessage &&
                  !messageText.startsWith(".")
                ) {
                  await this.sendMessage(
                    sessionId,
                    message.key.remoteJid!,
                    botConfig.autoReplyMessage
                  );
                }
              } catch (autoReplyError) {
                logger.error(
                  `Error in auto-reply for session ${sessionId}:`,
                  autoReplyError
                );
              }
            }
          }
        } catch (messageError) {
          logger.error(
            `Error handling message for session ${sessionId}:`,
            messageError
          );
          // Don't crash the session on message handling errors
        }
      });

      // Handle credentials update with error handling
      sock.ev.on("creds.update", async () => {
        try {
          logger.info(`Credentials updated for session: ${sessionId}`);
          await saveCreds();
        } catch (credUpdateError) {
          logger.error(
            `Failed to save updated credentials for ${sessionId}:`,
            credUpdateError
          );
        }
      });

      return sessionId;
    } catch (error) {
      logger.error(`Critical error creating session ${sessionId}:`, error);
      // Clean up any partial session state
      this.sessions.delete(sessionId);
      this.retryAttempts.delete(sessionId);

      // Update database status to failed
      try {
        await sessionService.updateSession(sessionId, {
          status: "DISCONNECTED",
        });
      } catch (dbError) {
        logger.error(`Failed to update session status after error:`, dbError);
      }

      throw error;
    }
  }

  private async saveMessageToDb(sessionId: string, message: WAMessage) {
    try {
      const messageContent =
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        message.message?.imageMessage?.caption ||
        "";

      let messageType = "TEXT";
      if (message.message?.imageMessage) messageType = "IMAGE";
      else if (message.message?.documentMessage) messageType = "DOCUMENT";
      else if (message.message?.audioMessage) messageType = "AUDIO";
      else if (message.message?.videoMessage) messageType = "VIDEO";
      else if (message.message?.stickerMessage) messageType = "STICKER";

      await messageService.saveMessage({
        sessionId,
        fromMe: message.key.fromMe || false,
        remoteJid: message.key.remoteJid!,
        messageId: message.key.id!,
        content: messageContent,
        messageType: messageType as any,
        timestamp: new Date(Number(message.messageTimestamp!) * 1000),
      });
    } catch (error) {
      logger.error(`Error saving message for session ${sessionId}:`, error);
    }
  }

  async sendMessage(
    sessionId: string,
    to: string,
    message: string,
    type: string = "text"
  ): Promise<string> {
    try {
      const session = this.sessions.get(sessionId);

      if (!session || session.status !== "connected") {
        logger.warn(
          `Attempt to send message on disconnected session: ${sessionId}`
        );
        throw new Error("Session not connected");
      }

      // Normalize recipient to a valid WhatsApp JID if a raw phone number was provided
      const toJid = this.normalizeToJid(to);

      let result;

      switch (type) {
        case "text":
          result = await session.sock.sendMessage(toJid, { text: message });
          break;
        case "image":
          // Handle image messages (requires file buffer)
          throw new Error("Image messages not implemented");
        case "document":
          // Handle document messages (requires file buffer)
          throw new Error("Document messages not implemented");
        default:
          result = await session.sock.sendMessage(toJid, { text: message });
      }

      // Save sent message to database
      if (result) {
        try {
          await messageService.saveMessage({
            sessionId,
            fromMe: true,
            remoteJid: toJid,
            messageId: result.key.id!,
            content: message,
            messageType: "TEXT",
            timestamp: new Date(),
          });
        } catch (saveError) {
          logger.error(`Error saving sent message to DB:`, saveError);
        }
      }

      return result.key.id!;
    } catch (error) {
      logger.error(`Error sending message on session ${sessionId}:`, error);
      throw error;
    }
  }

  async sendOfficialOtpMessage(
    sessionId: string,
    to: string,
    code: string,
    brand: string = process.env.BRAND_NAME || "WixTron",
    supportUrl: string = process.env.SUPPORT_URL ||
      "https://example.com/support"
  ): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== "connected") {
      throw new Error("Session not connected");
    }
    const toJid = this.normalizeToJid(to);

    const header = `🔒 ${brand} Verification`;
    const body = `${header}\n\nUse this one-time code to continue:\n\n\`\`\`${code}\`\`\`\n\nThis code expires in 10 minutes. Do not share it with anyone.`;
    const footer = `${brand} • Help: ${supportUrl}`;

    // const content: any = {
    //   text: body,
    //   footer,
    //   buttons: [
    //     {
    //       buttonId: `copy_${code}`,
    //       buttonText: { displayText: `Copy ${code}` },
    //       type: 1,
    //     },
    //   ],
    //   headerType: 1,
    // } ;

    const result = await session.sock.sendMessage(toJid, {
      text: body,
      body: body,
      footer,
      buttonReply: {
        id: `copy_${code}`,
        displayText: `Copy ${code}`,
        index: 1,
      },
    });

    try {
      // await messageService.saveMessage({
      //   sessionId,
      //   fromMe: true,
      //   remoteJid: toJid,
      //   messageId: result.key.id!,
      //   content: `${brand} OTP: ${code}`,
      //   messageType: "TEXT",
      //   timestamp: new Date(),
      // });
    } catch (saveError) {
      logger.error(`Error saving OTP message to DB:`, saveError);
    }

    return result.key.id!;
  }

  private normalizeToJid(to: string): string {
    try {
      if (!to) throw new Error("Missing recipient");

      // If already a JID, return as is
      if (to.includes("@")) return to;

      // Remove all non-digits
      let digits = to.replace(/[^0-9]/g, "");

      // Handle Nigerian phone numbers
      if (digits.length === 11 && digits.startsWith("0")) {
        // Nigerian local format: 09032622630 -> 2349032622630
        digits = "234" + digits.substring(1);
      } else if (digits.length === 10 && !digits.startsWith("234")) {
        // 10 digits without country code - could be Nigerian without leading 0
        // or US number. Prioritize US for backward compatibility
        digits = "1" + digits;
      } else if (digits.length === 13 && digits.startsWith("234")) {
        // Already has Nigerian country code: 2349032622630
        // Keep as is
      }

      if (digits.length < 10 || digits.length > 15) {
        throw new Error("Invalid phone number format");
      }

      return `${digits}@s.whatsapp.net`;
    } catch (e) {
      logger.warn(`Failed to normalize recipient '${to}', using raw value`);
      return to;
    }
  }

  async disconnectSession(sessionId: string): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);

      if (session?.sock) {
        try {
          await session.sock.logout();
        } catch (logoutError) {
          logger.error(
            `Error during logout for session ${sessionId}:`,
            logoutError
          );
        }
      }

      this.sessions.delete(sessionId);
      this.retryAttempts.delete(sessionId);

      await sessionService
        .updateSession(sessionId, {
          status: "DISCONNECTED",
        })
        .catch((dbError) => {
          logger.error(
            `Failed to update session status during disconnect:`,
            dbError
          );
        });
    } catch (error) {
      logger.error(`Error disconnecting session ${sessionId}:`, error);
    }
  }

  getSessionStatus(sessionId: string): string {
    try {
      const session = this.sessions.get(sessionId);
      return session?.status || "disconnected";
    } catch (error) {
      logger.error(`Error getting session status for ${sessionId}:`, error);
      return "disconnected";
    }
  }

  getSessionQR(sessionId: string): string | undefined {
    try {
      const session = this.sessions.get(sessionId);
      return session?.qr;
    } catch (error) {
      logger.error(`Error getting QR for session ${sessionId}:`, error);
      return undefined;
    }
  }

  getSessionPairingCode(sessionId: string): string | undefined {
    try {
      const session = this.sessions.get(sessionId);
      return session?.pairingCode;
    } catch (error) {
      logger.error(
        `Error getting pairing code for session ${sessionId}:`,
        error
      );
      return undefined;
    }
  }

  async createSessionWithPhone(
    sessionId: string,
    userId: string,
    phoneNumber: string
  ): Promise<string> {
    try {
      // Validate phone number format (basic validation)
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        throw new Error(
          "Invalid phone number format. Please provide a valid phone number."
        );
      }

      // Format phone number with country code if not present
      let formattedPhone = cleanPhone;
      if (!formattedPhone.startsWith("1") && formattedPhone.length === 10) {
        formattedPhone = "1" + formattedPhone; // Default to US if no country code
      }

      logger.info(`Creating session with phone number: ${formattedPhone}`);
      return await this.createSession(sessionId, userId, formattedPhone);
    } catch (error) {
      logger.error(
        `Failed to create session with phone ${phoneNumber}:`,
        error
      );
      throw error;
    }
  }

  // Clean up orphaned sessions (exist in memory but not in database)
  async cleanupOrphanedSessions(): Promise<void> {
    try {
      const activeSessions = await sessionService.getActiveSessions();
      const activeSessionIds = new Set(activeSessions.map((s) => s.sessionId));

      // Remove sessions that exist in memory but not in database
      for (const [sessionId] of this.sessions) {
        if (!activeSessionIds.has(sessionId)) {
          logger.info(`Cleaning up orphaned session: ${sessionId}`);
          this.sessions.delete(sessionId);
          this.retryAttempts.delete(sessionId);
        }
      }
    } catch (error) {
      logger.error("Error cleaning up orphaned sessions:", error);
    }
  }

  // Handle content commands (.menu, .help, .guide, etc.)
  private async handleContentCommands(
    sock: any,
    message: any,
    messageText: string,
    sessionId: string,
    userId: string
  ): Promise<boolean> {
    if (!messageText.startsWith(".")) return false;

    const command = messageText.toLowerCase().split(" ")[0];
    const chatId = message.key.remoteJid;

    try {
      let responseContent = "";
      const botStats = await contentService.getBotStats();
      const userContext = { phoneNumber: sock.user?.id?.split(":")[0] };

      switch (command) {
        case ".menu":
          responseContent = await contentService.sendMenuContent(sessionId, {
            botStats,
            userContext,
          });
          break;

        case ".help":
          responseContent = await contentService.sendHelpContent(sessionId, {
            botStats,
            userContext,
          });
          break;

        case ".guide":
          responseContent = await contentService.sendGuideContent(sessionId, {
            botStats,
            userContext,
          });
          break;

        case ".list":
          responseContent = await contentService.sendListContent(sessionId, {
            botStats,
            userContext,
          });
          break;

        default:
          // Command not handled by content service
          return false;
      }

      if (responseContent) {
        await sock.sendMessage(chatId, { text: responseContent });
        logger.info(`Sent ${command} content to ${chatId}`);

        // Add success reaction
        try {
          await sock.sendMessage(chatId, {
            react: { text: "✅", key: message.key },
          });
        } catch (reactionError) {
          logger.warn(`Failed to add success reaction: ${reactionError}`);
        }

        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Error handling content command ${command}:`, error);

      // Add error reaction
      try {
        await sock.sendMessage(chatId, {
          react: { text: "❌", key: message.key },
        });
      } catch (reactionError) {
        logger.warn(`Failed to add error reaction: ${reactionError}`);
      }

      await sock.sendMessage(chatId, {
        text: `Sorry, there was an error processing the ${command} command. Please try again later.`,
      });
      return false;
    }
  }

  // Handle plugin commands
  private async handlePluginCommands(
    sock: any,
    message: any,
    messageText: string,
    sessionId: string,
    userId: string
  ): Promise<void> {
    if (!messageText.startsWith(".")) return;

    const args = messageText.split(" ");
    const chatId = message.key.remoteJid;
    const sender = message.key.participant || message.key.remoteJid;
    const isGroup = chatId?.endsWith("@g.us") || false;

    logger.info(
      `Attempting to execute plugin command: ${args[0]} for user ${sender}`
    );

    try {
      // Check if user is admin (for group commands)
      let isAdmin = false;
      if (isGroup) {
        try {
          const groupMetadata = await sock.groupMetadata(chatId);
          const participant = groupMetadata.participants.find(
            (p: any) => p.id === sender
          );
          isAdmin =
            participant?.admin === "admin" ||
            participant?.admin === "superadmin";
        } catch (error) {
          logger.warn(`Failed to get group metadata for admin check: ${error}`);
        }
      }

      // Create plugin context
      const context = {
        sock,
        message,
        sessionId,
        userId,
        chatId,
        messageText,
        args,
        isGroup,
        isAdmin,
        sender,
      };

      // Execute plugin command
      const response = await pluginManager.executeCommand(context);
      logger.info(`Plugin command response:`, response);

      if (response && !response.success && response.error) {
        // Add error reaction
        try {
          await sock.sendMessage(chatId, {
            react: { text: "❌", key: message.key },
          });
        } catch (reactionError) {
          logger.warn(`Failed to add error reaction: ${reactionError}`);
        }

        // Only send error message if it's not a "command not found" error
        if (!response.error.includes("not found")) {
          await sock.sendMessage(chatId, { text: `❌ ${response.error}` });
        } else {
          logger.info(`Command ${args[0]} not found in plugins`);
        }
      } else if (!response) {
        logger.info(`No plugin found for command: ${args[0]}`);
      } else if (response.success) {
        // Add success reaction for successful plugin execution
        try {
          await sock.sendMessage(chatId, {
            react: { text: "✅", key: message.key },
          });
        } catch (reactionError) {
          logger.warn(`Failed to add success reaction: ${reactionError}`);
        }
      }
    } catch (error) {
      logger.error(`Error handling plugin command ${messageText}:`, error);
      await sock.sendMessage(chatId, {
        text: `❌ An error occurred while processing the command. Please try again later.`,
      });
    }
  }

  // Restore sessions on startup
  async restoreSessions(): Promise<void> {
    try {
      // First clean up any orphaned sessions
      await this.cleanupOrphanedSessions();

      const activeSessions = await sessionService.getActiveSessions();

      for (const session of activeSessions) {
        try {
          await this.createSession(session.sessionId, session.userId);
          logger.info(`Restored session: ${session.sessionId}`);
        } catch (error) {
          logger.error(
            `Failed to restore session ${session.sessionId}:`,
            error
          );
          // Continue with other sessions even if one fails
        }
      }
    } catch (error) {
      logger.error("Error restoring sessions:", error);
    }
  }
}

export const whatsappService = new WhatsAppService();
