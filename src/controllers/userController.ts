import { Request, Response } from "express";
import { userService } from "../services/userService";
import { logger } from "../utils/logger";
import { AuthRequest } from "../types";

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         email:
 *           type: string
 *         name:
 *           type: string
 *         apiKey:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     UpdateProfileRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         email:
 *           type: string
 *     UserSettings:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         notificationSettings:
 *           type: object
 *         apiSettings:
 *           type: object
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     UpdateSettingsRequest:
 *       type: object
 *       properties:
 *         notificationSettings:
 *           type: object
 *         apiSettings:
 *           type: object
 */

class UserController {
  /**
   * @swagger
   * /api/user/profile:
   *   get:
   *     summary: Get user profile
   *     tags: [User]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User profile retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/UserProfile'
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  async getProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const profile = await userService.getUserProfile(userId);

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      logger.error("Error getting user profile:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get user profile",
      });
    }
  }

  /**
   * @swagger
   * /api/user/profile:
   *   put:
   *     summary: Update user profile
   *     tags: [User]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateProfileRequest'
   *     responses:
   *       200:
   *         description: Profile updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/UserProfile'
   *       400:
   *         description: Invalid input
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  async updateProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { name, email } = req.body;

      const updatedProfile = await userService.updateUserProfile(userId, {
        name,
        email,
      });

      res.json({
        success: true,
        data: updatedProfile,
      });
    } catch (error) {
      logger.error("Error updating user profile:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update profile",
      });
    }
  }

  /**
   * @swagger
   * /api/user/settings:
   *   get:
   *     summary: Get user settings
   *     tags: [User]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User settings retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/UserSettings'
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  async getSettings(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const settings = await userService.getUserSettings(userId);

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      logger.error("Error getting user settings:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get user settings",
      });
    }
  }

  /**
   * @swagger
   * /api/user/settings:
   *   put:
   *     summary: Update user settings
   *     tags: [User]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateSettingsRequest'
   *     responses:
   *       200:
   *         description: Settings updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/UserSettings'
   *       400:
   *         description: Invalid input
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  async updateSettings(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { notificationSettings, apiSettings } = req.body;

      const updatedSettings = await userService.updateUserSettings(userId, {
        notificationSettings,
        apiSettings,
      });

      res.json({
        success: true,
        data: updatedSettings,
      });
    } catch (error) {
      logger.error("Error updating user settings:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update settings",
      });
    }
  }

  /**
   * @swagger
   * /api/user/api-key:
   *   post:
   *     summary: Generate new API key
   *     tags: [User]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: API key generated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     apiKey:
   *                       type: string
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  async generateApiKey(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const apiKey = await userService.generateApiKey(userId);

      res.json({
        success: true,
        data: { apiKey },
      });
    } catch (error) {
      logger.error("Error generating API key:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate API key",
      });
    }
  }

  /**
   * @swagger
   * /api/user/account:
   *   delete:
   *     summary: Delete user account
   *     tags: [User]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Account deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  async deleteAccount(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      await userService.deleteUserAccount(userId);

      res.json({
        success: true,
        message: "Account deleted successfully",
      });
    } catch (error) {
      logger.error("Error deleting user account:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete account",
      });
    }
  }
}

export const userController = new UserController();
