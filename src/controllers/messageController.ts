import { Response, NextFunction } from "express";
import { messageService } from "../services/messageService";
import { sessionService } from "../services/sessionService";
import { whatsappService } from "../services/whatsappService";
import { AuthRequest } from "../types";
import { AppError } from "../utils/errors";
import { MessageStatus } from "../generated/prisma";

/**
 * @swagger
 * /messages/{sessionId}:
 *   get:
 *     summary: Get messages for a session with pagination and filtering
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: remoteJid
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SENT, DELIVERED, READ, FAILED]
 *       - in: query
 *         name: fromMe
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Messages retrieved successfully with pagination
 */
export const getMessages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.params;
    const {
      page = "1",
      limit = "50",
      remoteJid,
      status,
      fromMe,
      dateFrom,
      dateTo,
    } = req.query;
    const userId = req.user!.id;

    // Validate session ownership
    const session = await sessionService.getSession(sessionId);
    if (!session || session.userId !== userId) {
      throw new AppError("Session not found", 404);
    }

    const filter = {
      sessionId,
      ...(remoteJid && { remoteJid: remoteJid as string }),
      ...(status && { status: status as MessageStatus }),
      ...(fromMe !== undefined && { fromMe: fromMe === "true" }),
      ...(dateFrom && { dateFrom: new Date(dateFrom as string) }),
      ...(dateTo && { dateTo: new Date(dateTo as string) }),
    };

    const options = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    };

    const result = await messageService.getMessages(filter, options);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /messages/{sessionId}/contact/{remoteJid}:
 *   get:
 *     summary: Get messages for a specific contact
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: WhatsApp session ID
 *       - in: path
 *         name: remoteJid
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact JID (URL encoded, e.g. 1234567890%40s.whatsapp.net)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of messages to retrieve
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
export const getMessagesByContact = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId, remoteJid } = req.params;
    const { page = "1", limit = "50" } = req.query;
    const userId = req.user!.id;

    // Validate session ownership
    const session = await sessionService.getSession(sessionId);
    if (!session || session.userId !== userId) {
      throw new AppError("Session not found", 404);
    }

    const options = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    };

    const result = await messageService.getMessagesByContact(
      sessionId,
      remoteJid,
      options
    );

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a message using any active WhatsApp session for the authenticated user
 */
export const sendAnySessionMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.body?.user?.id;
    const body = req.body as any;
    const to: string = body.jid;
    const message: string | undefined = body.message;
    const type: string = body.type ?? "text";
    const otp: string | undefined = body.otp;
    const brand: string | undefined = body.brand;

    // Get user's active sessions from DB
    const active = await sessionService.getActiveSessions();
    // const userActive = active.filter((s) => s.userId === userId);

    // if (userActive.length === 0) {
    //   throw new AppError("No active sessions available", 404);
    // }

    // Pick the first connected session in memory
    const connected = active.find(
      (s) => whatsappService.getSessionStatus(s.sessionId) === "connected"
    );

    if (!connected) {
      throw new AppError("No connected sessions available", 400);
    }

    const messageId = otp
      ? await whatsappService.sendOfficialOtpMessage(
          connected.sessionId,
          to,
          otp,
          brand
        )
      : await whatsappService.sendMessage(
          connected.sessionId,
          to,
          message!,
          type
        );

    res.status(200).json({
      success: true,
      data: {
        messageId,
        sessionId: connected.sessionId,
        to,
        message: otp ? `OTP: ${otp}` : message,
        type: otp ? "text" : type,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};
