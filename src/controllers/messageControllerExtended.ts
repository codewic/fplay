import { Response, NextFunction } from "express";
import { messageService } from "../services/messageService";
import { sessionService } from "../services/sessionService";
import { AuthRequest } from "../types";
import { AppError } from "../utils/errors";

/**
 * @swagger
 * /messages/{messageId}/status:
 *   put:
 *     summary: Update message status
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [SENT, DELIVERED, READ, FAILED]
 *     responses:
 *       200:
 *         description: Message status updated successfully
 */
export const updateMessageStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { messageId } = req.params;
    const { status } = req.body;

    const updatedMessage = await messageService.updateMessageStatus(messageId, status);

    res.status(200).json({
      success: true,
      data: updatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /messages/{sessionId}/stats:
 *   get:
 *     summary: Get message statistics for a session
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
 *         description: Message statistics retrieved successfully
 */
export const getMessageStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.params;
    const { dateFrom, dateTo } = req.query;
    const userId = req.user!.id;

    // Validate session ownership
    const session = await sessionService.getSession(sessionId);
    if (!session || session.userId !== userId) {
      throw new AppError("Session not found", 404);
    }

    const stats = await messageService.getMessageStats(
      sessionId,
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /messages/{sessionId}/contacts:
 *   get:
 *     summary: Get contact list for a session
 *     tags: [Messages]
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
 *         description: Contact list retrieved successfully
 */
export const getContactList = async (
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

    const contacts = await messageService.getContactList(sessionId);

    res.status(200).json({
      success: true,
      data: contacts,
    });
  } catch (error) {
    next(error);
  }
};
