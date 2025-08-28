import { prisma } from "../config/database";
import { MessageType, MessageStatus } from "../generated/prisma";
import { logger } from "../utils/logger";

interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string;
}

interface MessageFilter {
  sessionId: string;
  remoteJid?: string;
  status?: MessageStatus;
  fromMe?: boolean;
  messageType?: MessageType;
  dateFrom?: Date;
  dateTo?: Date;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class MessageService {
  async saveMessage(data: {
    sessionId: string;
    fromMe: boolean;
    remoteJid: string;
    messageId: string;
    content?: string;
    messageType: MessageType;
    timestamp: Date;
    status?: MessageStatus;
  }) {
    try {
      return await prisma.message.create({
        data: {
          ...data,
          status: data.status || MessageStatus.SENT,
        },
      });
    } catch (error) {
      logger.error("Error saving message:", error);
      throw error;
    }
  }

  async updateMessageStatus(messageId: string, status: MessageStatus) {
    try {
      return await prisma.message.update({
        where: { messageId },
        data: {
          status,
        },
      });
    } catch (error) {
      logger.error("Error updating message status:", error);
      throw error;
    }
  }

  async getMessages(
    filter: MessageFilter,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<any>> {
    try {
      const { page = 1, limit = 50 } = options;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        sessionId: filter.sessionId,
      };

      if (filter.remoteJid) where.remoteJid = filter.remoteJid;
      if (filter.status) where.status = filter.status;
      if (filter.fromMe !== undefined) where.fromMe = filter.fromMe;
      if (filter.messageType) where.messageType = filter.messageType;

      if (filter.dateFrom || filter.dateTo) {
        where.timestamp = {};
        if (filter.dateFrom) where.timestamp.gte = filter.dateFrom;
        if (filter.dateTo) where.timestamp.lte = filter.dateTo;
      }

      // Get total count
      const total = await prisma.message.count({ where });

      // Get messages
      const messages = await prisma.message.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: limit,
        skip,
        select: {
          id: true,
          messageId: true,
          sessionId: true,
          fromMe: true,
          remoteJid: true,
          content: true,
          messageType: true,
          status: true,
          timestamp: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const totalPages = Math.ceil(total / limit);

      return {
        data: messages,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error("Error getting messages:", error);
      throw error;
    }
  }

  async getMessagesByContact(
    sessionId: string,
    remoteJid: string,
    options: PaginationOptions = {}
  ) {
    return this.getMessages({ sessionId, remoteJid }, options);
  }

  async getMessageStats(sessionId: string, dateFrom?: Date, dateTo?: Date) {
    try {
      const where: any = { sessionId };

      if (dateFrom || dateTo) {
        where.timestamp = {};
        if (dateFrom) where.timestamp.gte = dateFrom;
        if (dateTo) where.timestamp.lte = dateTo;
      }

      const stats = await prisma.message.groupBy({
        by: ["status"],
        where,
        _count: { status: true },
      });

      const totalMessages = await prisma.message.count({ where });

      const statusStats = stats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.status;
        return acc;
      }, {} as Record<string, number>);

      return {
        total: totalMessages,
        byStatus: statusStats,
      };
    } catch (error) {
      logger.error("Error getting message stats:", error);
      throw error;
    }
  }

  async getContactList(sessionId: string) {
    try {
      const contacts = await prisma.message.groupBy({
        by: ["remoteJid"],
        where: { sessionId },
        _count: { remoteJid: true },
        _max: { timestamp: true },
        orderBy: { _max: { timestamp: "desc" } },
      });

      return contacts.map((contact) => ({
        remoteJid: contact.remoteJid,
        messageCount: contact._count.remoteJid,
        lastMessageAt: contact._max.timestamp,
      }));
    } catch (error) {
      logger.error("Error getting contact list:", error);
      throw error;
    }
  }

  async deleteMessage(messageId: string) {
    try {
      return await prisma.message.delete({
        where: { messageId },
      });
    } catch (error) {
      logger.error("Error deleting message:", error);
      throw error;
    }
  }

  async bulkUpdateMessageStatus(messageIds: string[], status: MessageStatus) {
    try {
      return await prisma.message.updateMany({
        where: { messageId: { in: messageIds } },
        data: {
          status,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error("Error bulk updating message status:", error);
      throw error;
    }
  }
}

export const messageService = new MessageService();
