import { prisma } from "../config/database";
import { logger } from "../utils/logger";

interface DateFilter {
  from?: Date;
  to?: Date;
  sessionId?: string;
}

class AnalyticsService {
  async getMetrics(userId: string, filter: DateFilter = {}) {
    try {
      const { from, to, sessionId } = filter;

      // Build date filter
      const dateFilter: any = {};
      if (from || to) {
        dateFilter.createdAt = {};
        if (from) dateFilter.createdAt.gte = from;
        if (to) dateFilter.createdAt.lte = to;
      }

      // Get user's sessions for filtering
      const userSessions = await prisma.session.findMany({
        where: { userId },
        select: { sessionId: true },
      });

      const userSessionIds = userSessions.map((s) => s.sessionId);

      // Build message filter
      const messageFilter: any = {
        sessionId: { in: userSessionIds },
        ...dateFilter,
      };

      if (sessionId) {
        messageFilter.sessionId = sessionId;
      }

      // Get total messages
      const totalMessages = await prisma.message.count({
        where: messageFilter,
      });

      // Get delivered messages
      const deliveredMessages = await prisma.message.count({
        where: {
          ...messageFilter,
          status: { in: ["DELIVERED", "READ"] },
        },
      });

      // Get failed messages
      const failedMessages = await prisma.message.count({
        where: {
          ...messageFilter,
          status: "FAILED",
        },
      });

      // Calculate delivery rate
      const deliveryRate =
        totalMessages > 0 ? (deliveredMessages / totalMessages) * 100 : 0;

      // Get active sessions
      const activeSessions = await prisma.session.count({
        where: {
          userId,
          status: "CONNECTED",
        },
      });

      // Get total unique contacts
      const totalContacts = await prisma.message.groupBy({
        by: ["remoteJid"],
        where: messageFilter,
        _count: { remoteJid: true },
      });

      // Calculate growth metrics (compare with previous period)
      const previousPeriodFilter = this.getPreviousPeriodFilter(from, to);
      const previousMessages = await prisma.message.count({
        where: {
          sessionId: { in: userSessionIds },
          ...previousPeriodFilter,
        },
      });

      const previousDelivered = await prisma.message.count({
        where: {
          sessionId: { in: userSessionIds },
          status: { in: ["DELIVERED", "READ"] },
          ...previousPeriodFilter,
        },
      });

      const messageGrowth =
        previousMessages > 0
          ? ((totalMessages - previousMessages) / previousMessages) * 100
          : 0;

      const previousDeliveryRate =
        previousMessages > 0 ? (previousDelivered / previousMessages) * 100 : 0;

      const deliveryGrowth =
        previousDeliveryRate > 0
          ? ((deliveryRate - previousDeliveryRate) / previousDeliveryRate) * 100
          : 0;

      return {
        totalMessages,
        deliveredMessages,
        failedMessages,
        deliveryRate: Math.round(deliveryRate * 10) / 10,
        activeSessions,
        totalContacts: totalContacts.length,
        messageGrowth: Math.round(messageGrowth * 10) / 10,
        deliveryGrowth: Math.round(deliveryGrowth * 10) / 10,
      };
    } catch (error) {
      logger.error("Error getting analytics metrics:", error);
      throw error;
    }
  }

  async getMessageVolume(userId: string, filter: DateFilter = {}) {
    try {
      const { from, to, sessionId } = filter;

      // Default to last 30 days if no date range provided
      const endDate = to || new Date();
      const startDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Get user's sessions
      const userSessions = await prisma.session.findMany({
        where: { userId },
        select: { sessionId: true },
      });

      const userSessionIds = userSessions.map((s) => s.sessionId);

      const messageFilter: any = {
        sessionId: { in: userSessionIds },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (sessionId) {
        messageFilter.sessionId = sessionId;
      }

      // Get messages grouped by date
      const messages = await prisma.message.findMany({
        where: messageFilter,
        select: {
          createdAt: true,
          status: true,
        },
      });

      // Group messages by date
      const volumeMap = new Map<
        string,
        { sent: number; delivered: number; failed: number }
      >();

      messages.forEach((message) => {
        const date = message.createdAt.toISOString().split("T")[0];

        if (!volumeMap.has(date)) {
          volumeMap.set(date, { sent: 0, delivered: 0, failed: 0 });
        }

        const dayData = volumeMap.get(date)!;
        dayData.sent++;

        if (message.status === "DELIVERED" || message.status === "READ") {
          dayData.delivered++;
        } else if (message.status === "FAILED") {
          dayData.failed++;
        }
      });

      // Convert to array and sort by date
      const volumeData = Array.from(volumeMap.entries())
        .map(([date, data]) => ({
          date,
          ...data,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return volumeData;
    } catch (error) {
      logger.error("Error getting message volume:", error);
      throw error;
    }
  }

  async getSessionPerformance(userId: string) {
    try {
      const sessions = await prisma.session.findMany({
        where: { userId },
      });

      const performanceData = await Promise.all(
        sessions.map(async (session) => {
          // Get message count for this session
          const messagesSent = await prisma.message.count({
            where: { sessionId: session.sessionId },
          });

          // Get delivered messages
          const deliveredMessages = await prisma.message.count({
            where: {
              sessionId: session.sessionId,
              status: { in: ["DELIVERED", "READ"] },
            },
          });

          const deliveryRate =
            messagesSent > 0 ? (deliveredMessages / messagesSent) * 100 : 0;

          // Calculate uptime (simplified - based on session status)
          const uptime = session.status === "CONNECTED" ? 99.9 : 85.0; // Placeholder logic

          return {
            sessionName:
              session.name || `Session ${session.sessionId.slice(0, 8)}`,
            messagesSent,
            deliveryRate: Math.round(deliveryRate * 10) / 10,
            uptime: Math.round(uptime * 10) / 10,
          };
        })
      );

      return performanceData;
    } catch (error) {
      logger.error("Error getting session performance:", error);
      throw error;
    }
  }

  async getDeliveryStatus(userId: string, filter: DateFilter = {}) {
    try {
      const { from, to, sessionId } = filter;

      // Build date filter
      const dateFilter: any = {};
      if (from || to) {
        dateFilter.createdAt = {};
        if (from) dateFilter.createdAt.gte = from;
        if (to) dateFilter.createdAt.lte = to;
      }

      // Get user's sessions
      const userSessions = await prisma.session.findMany({
        where: { userId },
        select: { sessionId: true },
      });

      const userSessionIds = userSessions.map((s) => s.sessionId);

      const messageFilter: any = {
        sessionId: { in: userSessionIds },
        ...dateFilter,
      };

      if (sessionId) {
        messageFilter.sessionId = sessionId;
      }

      // Get message status counts
      const statusCounts = await prisma.message.groupBy({
        by: ["status"],
        where: messageFilter,
        _count: { status: true },
      });

      const totalMessages = statusCounts.reduce(
        (sum, item) => sum + item._count.status,
        0
      );

      const deliveryData = statusCounts.map((item) => {
        const statusLabels: Record<string, string> = {
          SENT: "Sent",
          DELIVERED: "Delivered",
          READ: "Read",
          FAILED: "Failed",
        };

        return {
          status: statusLabels[item.status] || item.status,
          count: item._count.status,
          percentage:
            totalMessages > 0
              ? Math.round((item._count.status / totalMessages) * 1000) / 10
              : 0,
        };
      });

      return deliveryData;
    } catch (error) {
      logger.error("Error getting delivery status:", error);
      throw error;
    }
  }

  private getPreviousPeriodFilter(from?: Date, to?: Date) {
    if (!from || !to) {
      // Default to previous 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

      return {
        createdAt: {
          gte: sixtyDaysAgo,
          lte: thirtyDaysAgo,
        },
      };
    }

    const periodLength = to.getTime() - from.getTime();
    const previousTo = new Date(from.getTime());
    const previousFrom = new Date(from.getTime() - periodLength);

    return {
      createdAt: {
        gte: previousFrom,
        lte: previousTo,
      },
    };
  }
}

export const analyticsService = new AnalyticsService();
