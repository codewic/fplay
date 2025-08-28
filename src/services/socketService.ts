import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger";

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

class SocketService {
  private io: SocketIOServer | null = null;
  private userSockets: Map<string, string[]> = new Map(); // userId -> socketIds[]

  initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // Authentication middleware
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        socket.userId = decoded.id;
        
        logger.info(`Socket authenticated for user: ${socket.userId}`);
        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });

    this.io.on("connection", (socket: any) => {
      logger.info(`Socket connected: ${socket.id} for user: ${socket.userId}`);

      // Track user socket connections
      const userSockets = this.userSockets.get(socket.userId) || [];
      userSockets.push(socket.id);
      this.userSockets.set(socket.userId, userSockets);

      // Join user-specific room
      socket.join(`user:${socket.userId}`);

      // Handle session-specific room joining
      socket.on("join-session", (sessionId: string) => {
        socket.join(`session:${sessionId}`);
        logger.info(`Socket ${socket.id} joined session room: ${sessionId}`);
      });

      // Handle leaving session room
      socket.on("leave-session", (sessionId: string) => {
        socket.leave(`session:${sessionId}`);
        logger.info(`Socket ${socket.id} left session room: ${sessionId}`);
      });

      // Handle disconnect
      socket.on("disconnect", () => {
        logger.info(`Socket disconnected: ${socket.id} for user: ${socket.userId}`);
        
        // Remove socket from user tracking
        const userSockets = this.userSockets.get(socket.userId) || [];
        const updatedSockets = userSockets.filter(id => id !== socket.id);
        
        if (updatedSockets.length === 0) {
          this.userSockets.delete(socket.userId);
        } else {
          this.userSockets.set(socket.userId, updatedSockets);
        }
      });
    });

    logger.info("Socket.IO server initialized");
  }

  // Emit QR code updates to specific session
  emitQRCode(sessionId: string, userId: string, qrCode: string) {
    if (!this.io) return;

    this.io.to(`session:${sessionId}`).emit("qr-code", {
      sessionId,
      qrCode,
      timestamp: new Date(),
    });

    // Also emit to user room as fallback
    this.io.to(`user:${userId}`).emit("qr-code", {
      sessionId,
      qrCode,
      timestamp: new Date(),
    });

    logger.info(`Emitted QR code for session: ${sessionId}`);
  }

  // Emit pairing code updates to specific session
  emitPairingCode(sessionId: string, userId: string, pairingCode: string, phoneNumber: string) {
    if (!this.io) return;

    this.io.to(`session:${sessionId}`).emit("pairing-code", {
      sessionId,
      pairingCode,
      phoneNumber,
      timestamp: new Date(),
    });

    // Also emit to user room as fallback
    this.io.to(`user:${userId}`).emit("pairing-code", {
      sessionId,
      pairingCode,
      phoneNumber,
      timestamp: new Date(),
    });

    logger.info(`Emitted pairing code for session: ${sessionId}, phone: ${phoneNumber}`);
  }

  // Emit error messages
  emitError(sessionId: string, userId: string, error: string) {
    if (!this.io) return;

    this.io.to(`session:${sessionId}`).emit("session-error", {
      sessionId,
      error,
      timestamp: new Date(),
    });

    this.io.to(`user:${userId}`).emit("session-error", {
      sessionId,
      error,
      timestamp: new Date(),
    });

    logger.info(`Emitted error for session: ${sessionId}, error: ${error}`);
  }

  // Emit session status updates
  emitSessionStatus(sessionId: string, userId: string, status: string, data?: any) {
    if (!this.io) return;

    const payload = {
      sessionId,
      status,
      timestamp: new Date(),
      ...data,
    };

    this.io.to(`session:${sessionId}`).emit("session-status", payload);
    this.io.to(`user:${userId}`).emit("session-status", payload);

    logger.info(`Emitted session status for session: ${sessionId}, status: ${status}`);
  }

  // Emit new message notifications
  emitNewMessage(sessionId: string, userId: string, message: any) {
    if (!this.io) return;

    this.io.to(`session:${sessionId}`).emit("new-message", {
      sessionId,
      message,
      timestamp: new Date(),
    });

    this.io.to(`user:${userId}`).emit("new-message", {
      sessionId,
      message,
      timestamp: new Date(),
    });

    logger.info(`Emitted new message for session: ${sessionId}`);
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  // Check if user is connected
  isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  // Emit to specific user
  emitToUser(userId: string, event: string, data: any) {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit(event, data);
    logger.info(`Emitted ${event} to user: ${userId}`);
  }

  // Broadcast to all connected clients
  broadcast(event: string, data: any) {
    if (!this.io) return;

    this.io.emit(event, data);
    logger.info(`Broadcasted ${event} to all clients`);
  }
}

export const socketService = new SocketService();
