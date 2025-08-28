import { prisma } from "../config/database";
import { SessionStatus } from "../generated/prisma";
import { encrypt, decrypt } from "../utils/crypto";

class SessionService {
  async createSession(userId: string, sessionId: string, name?: string) {
    return await prisma.session.create({
      data: {
        userId,
        sessionId,
        name,
        status: "PENDING",
      },
      include: {
        botConfig: true,
      },
    });
  }

  async getSession(sessionId: string) {
    return await prisma.session.findUnique({
      where: { sessionId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        botConfig: true,
      },
    });
  }

  async updateSession(
    sessionId: string,
    data: Partial<{
      status: SessionStatus;
      phoneNumber: string | null;
      pairingCode: string | null;
      qrCode: string | null;
      lastSeen: Date;
    }>
  ) {
    try {
      return await prisma.session.update({
        where: { sessionId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    } catch (error: any) {
      if (error.code === "P2025") {
        // Session not found - log and return null instead of throwing
        console.warn(
          `Session ${sessionId} not found for update, it may have been deleted`
        );
        return null;
      }
      throw error;
    }
  }

  async deleteSession(sessionId: string) {
    return await prisma.session.delete({
      where: { sessionId },
    });
  }

  async getUserSessions(userId: string) {
    return await prisma.session.findMany({
      where: { userId },
      include: {
        botConfig: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async saveSessionCreds(sessionId: string, creds: string) {
    try {
      // const encryptedCreds = encrypt(creds);
      return await prisma.session.update({
        where: { sessionId },
        data: { encryptedCreds: creds },
      });
    } catch (error) {
      console.error(
        `Failed to save credentials for session ${sessionId}:`,
        error
      );
      // Don't throw the error to prevent session creation from failing
      // Just log it and continue without saving credentials
      return null;
    }
  }

  async getSessionCreds(sessionId: string): Promise<string | null> {
    const session = await prisma.session.findUnique({
      where: { sessionId },
      select: { encryptedCreds: true },
    });

    if (!session?.encryptedCreds) return null;

    try {
      return session.encryptedCreds;
    } catch (error) {
      return null;
    }
  }

  async getBotConfig(sessionId: string) {
    const session = await prisma.session.findUnique({
      where: { sessionId },
      include: { botConfig: true },
    });

    return session?.botConfig;
  }

  async createOrUpdateBotConfig(
    sessionId: string,
    config: {
      name?: string;
      welcomeMessage?: string;
      autoReply?: boolean;
      autoReplyMessage?: string;
      webhookUrl?: string;
      isActive?: boolean;
    }
  ) {
    return await prisma.botConfig.upsert({
      where: { sessionId },
      update: config,
      create: {
        sessionId,
        ...config,
      },
    });
  }

  async getActiveSessions() {
    return await prisma.session.findMany({
      where: {
        status: { in: ["CONNECTED", "PENDING"] },
        encryptedCreds: { not: null },
      },
      select: {
        sessionId: true,
        userId: true,
        status: true,
      },
    });
  }
}

export const sessionService = new SessionService();
