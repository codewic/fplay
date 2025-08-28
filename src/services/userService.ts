import { prisma } from "../config/database";
import { logger } from "../utils/logger";
import crypto from "crypto";

interface UpdateProfileData {
  name?: string;
  email?: string;
}

interface UpdateSettingsData {
  notificationSettings?: any;
  apiSettings?: any;
}

class UserService {
  async getUserProfile(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          apiKey: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return user;
    } catch (error) {
      logger.error("Error getting user profile:", error);
      throw error;
    }
  }

  async updateUserProfile(userId: string, data: UpdateProfileData) {
    try {
      // Check if email is already taken by another user
      if (data.email) {
        const existingUser = await prisma.user.findFirst({
          where: {
            email: data.email,
            NOT: { id: userId },
          },
        });

        if (existingUser) {
          throw new Error("Email is already taken");
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.email && { email: data.email }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          apiKey: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedUser;
    } catch (error) {
      logger.error("Error updating user profile:", error);
      throw error;
    }
  }

  async getUserSettings(userId: string) {
    try {
      let settings = await prisma.userSettings.findUnique({
        where: { userId },
      });

      // Create default settings if they don't exist
      if (!settings) {
        settings = await prisma.userSettings.create({
          data: {
            userId,
            // @ts-ignore
            notificationSettings: {
              emailNotifications: true,
              pushNotifications: true,
              messageAlerts: true,
              sessionAlerts: true,
            },
            apiSettings: {
              rateLimit: 100,
              webhookUrl: null,
              allowedIPs: [],
            },
          },
        });
      }

      return settings;
    } catch (error) {
      logger.error("Error getting user settings:", error);
      throw error;
    }
  }

  async updateUserSettings(userId: string, data: UpdateSettingsData) {
    try {
      // First ensure settings exist
      await this.getUserSettings(userId);

      const updatedSettings = await prisma.userSettings.update({
        where: { userId },
        // @ts-ignore
        data: {
          ...(data.notificationSettings && {
            notificationSettings: data.notificationSettings,
          }),
          ...(data.apiSettings && { apiSettings: data.apiSettings }),
        },
      });

      return updatedSettings;
    } catch (error) {
      logger.error("Error updating user settings:", error);
      throw error;
    }
  }

  async generateApiKey(userId: string) {
    try {
      // Generate a secure random API key
      const apiKey = `wab_${crypto.randomBytes(32).toString("hex")}`;

      await prisma.user.update({
        where: { id: userId },
        data: { apiKey },
      });

      return apiKey;
    } catch (error) {
      logger.error("Error generating API key:", error);
      throw error;
    }
  }

  async deleteUserAccount(userId: string) {
    try {
      // Delete user data in the correct order to handle foreign key constraints

      // Delete user settings
      await prisma.userSettings.deleteMany({
        where: { userId },
      });

      // Delete templates
      await prisma.template.deleteMany({
        where: { userId },
      });

      // Delete messages for user's sessions
      const userSessions = await prisma.session.findMany({
        where: { userId },
        select: { sessionId: true },
      });

      const sessionIds = userSessions.map((s) => s.sessionId);

      if (sessionIds.length > 0) {
        await prisma.message.deleteMany({
          where: { sessionId: { in: sessionIds } },
        });
      }

      // Delete sessions
      await prisma.session.deleteMany({
        where: { userId },
      });

      // Finally delete the user
      await prisma.user.delete({
        where: { id: userId },
      });

      logger.info(`User account deleted: ${userId}`);
    } catch (error) {
      logger.error("Error deleting user account:", error);
      throw error;
    }
  }

  async getUserByApiKey(apiKey: string) {
    try {
      const user = await prisma.user.findFirst({
        where: { apiKey },
        select: {
          id: true,
          email: true,
          name: true,
          apiKey: true,
        },
      });

      return user;
    } catch (error) {
      logger.error("Error getting user by API key:", error);
      throw error;
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const user = await this.getUserByApiKey(apiKey);
      return !!user;
    } catch (error) {
      logger.error("Error validating API key:", error);
      return false;
    }
  }
}

export const userService = new UserService();
