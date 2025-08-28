import { Response, NextFunction } from "express";
import { ObjectId } from "bson";
import { whatsappService } from "../services/whatsappService";
import { sessionService } from "../services/sessionService";
import { AuthRequest, QRCodeResponse, SessionStatusResponse } from "../types";
import { AppError } from "../utils/errors";

/**
 * @swagger
 * /sessions/start:
 *   post:
 *     summary: Start a new WhatsApp session
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Optional session name
 *     responses:
 *       200:
 *         description: Session started successfully
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
 *                     sessionId:
 *                       type: string
 *                     qrCode:
 *                       type: string
 */
export const startSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const sessionId = new ObjectId().toString();

    const name = req.body.name;

    // Create session in database
    await sessionService.createSession(userId, sessionId, name);

    // Start WhatsApp session
    const qrCode = await whatsappService.createSession(sessionId, userId);

    const response: QRCodeResponse = {
      sessionId,
      qrCode,
    };

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /sessions/start-with-phone:
 *   post:
 *     summary: Start a new WhatsApp session with phone number pairing
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number with country code (e.g., +1234567890)
 *               name:
 *                 type: string
 *                 description: Optional session name
 *     responses:
 *       200:
 *         description: Session started successfully with pairing code
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
 *                     sessionId:
 *                       type: string
 *                     pairingCode:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 */
export const startSessionWithPhone = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const sessionId = new ObjectId().toString();
    const { phoneNumber, name } = req.body;

    if (!phoneNumber) {
      throw new AppError("Phone number is required", 400);
    }

    // Create session in database
    await sessionService.createSession(userId, sessionId, name);

    // Start WhatsApp session with phone number
    await whatsappService.createSessionWithPhone(
      sessionId,
      userId,
      phoneNumber
    );

    // Get pairing code (it will be generated during connection)
    const pairingCode = whatsappService.getSessionPairingCode(sessionId);

    res.status(200).json({
      success: true,
      data: {
        sessionId,
        phoneNumber,
        message:
          "Pairing code will be generated shortly. Please wait for the pairing-code event via WebSocket.",
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /sessions/{sessionId}:
 *   get:
 *     summary: Get session status
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session status retrieved successfully
 */
export const getSessionStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.id;

    const session = await sessionService.getSession(sessionId);

    if (!session || session.userId !== userId) {
      throw new AppError("Session not found", 404);
    }

    const status = whatsappService.getSessionStatus(sessionId);
    const qrCode = whatsappService.getSessionQR(sessionId);
    const pairingCode = whatsappService.getSessionPairingCode(sessionId);

    const response: SessionStatusResponse = {
      sessionId,
      status,
      phoneNumber: session.phoneNumber || undefined,
      lastSeen: session.lastSeen || undefined,
    };

    if (status === "pending") {
      if (qrCode) {
        (response as any).qrCode = qrCode;
      }
      if (pairingCode) {
        (response as any).pairingCode = pairingCode;
      }
    }

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /sessions/{sessionId}/message:
 *   post:
 *     summary: Send a message
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *               - message
 *             properties:
 *               to:
 *                 type: string
 *                 description: Phone number with country code
 *               message:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [text, image, document]
 *                 default: text
 *     responses:
 *       200:
 *         description: Message sent successfully
 */
export const sendMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.params;
    const { to, message, type = "text" } = req.body;
    const userId = req.user!.id;

    // Validate session ownership
    const session = await sessionService.getSession(sessionId);
    if (!session || session.userId !== userId) {
      throw new AppError("Session not found", 404);
    }

    // Validate session status
    const status = whatsappService.getSessionStatus(sessionId);
    if (status !== "connected") {
      throw new AppError("Session not connected", 400);
    }

    // Send message
    const messageId = await whatsappService.sendMessage(
      sessionId,
      to,
      message,
      type
    );

    res.status(200).json({
      success: true,
      data: {
        messageId,
        to,
        message,
        type,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /sessions/{sessionId}:
 *   delete:
 *     summary: Disconnect and delete session
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session disconnected successfully
 */
export const disconnectSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.id;

    // Validate session ownership
    const session = await sessionService.getSession(sessionId);
    if (!session || session.userId !== userId) {
      throw new AppError("Session not found", 404);
    }

    // Disconnect WhatsApp session
    await whatsappService.disconnectSession(sessionId);

    // Delete session from database
    await sessionService.deleteSession(sessionId);

    res.status(200).json({
      success: true,
      message: "Session disconnected successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /sessions:
 *   get:
 *     summary: Get all user sessions
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 */
export const getUserSessions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const sessions = await sessionService.getUserSessions(userId);

    // Add current status from WhatsApp service
    const sessionsWithStatus = sessions.map((session) => ({
      ...session,
      currentStatus: whatsappService.getSessionStatus(session.sessionId),
      connectionMethod: session.pairingCode ? "phone" : "qr",
    }));

    res.status(200).json({
      success: true,
      data: sessionsWithStatus,
    });
  } catch (error) {
    next(error);
  }
};
