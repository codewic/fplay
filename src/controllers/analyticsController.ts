import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import { analyticsService } from "../services/analyticsService";
import { AppError } from "../utils/errors";

/**
 * @swagger
 * /analytics/metrics:
 *   get:
 *     summary: Get analytics metrics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date (ISO string)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date (ISO string)
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: string
 *         description: Filter by session (optional)
 *     responses:
 *       200:
 *         description: Analytics metrics retrieved successfully
 */
export const getMetrics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { from, to, sessionId } = req.query;

    const fromDate = from ? new Date(from as string) : undefined;
    const toDate = to ? new Date(to as string) : undefined;

    if (from && isNaN(fromDate!.getTime())) {
      throw new AppError("Invalid 'from' date format", 400);
    }

    if (to && isNaN(toDate!.getTime())) {
      throw new AppError("Invalid 'to' date format", 400);
    }

    const metrics = await analyticsService.getMetrics(userId, {
      from: fromDate,
      to: toDate,
      sessionId: sessionId as string,
    });

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /analytics/message-volume:
 *   get:
 *     summary: Get message volume data for charts
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date (ISO string)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date (ISO string)
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: string
 *         description: Filter by session (optional)
 *     responses:
 *       200:
 *         description: Message volume data retrieved successfully
 */
export const getMessageVolume = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { from, to, sessionId } = req.query;

    const fromDate = from ? new Date(from as string) : undefined;
    const toDate = to ? new Date(to as string) : undefined;

    if (from && isNaN(fromDate!.getTime())) {
      throw new AppError("Invalid 'from' date format", 400);
    }

    if (to && isNaN(toDate!.getTime())) {
      throw new AppError("Invalid 'to' date format", 400);
    }

    const volumeData = await analyticsService.getMessageVolume(userId, {
      from: fromDate,
      to: toDate,
      sessionId: sessionId as string,
    });

    res.status(200).json({
      success: true,
      data: volumeData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /analytics/session-performance:
 *   get:
 *     summary: Get session performance data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Session performance data retrieved successfully
 */
export const getSessionPerformance = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const performanceData = await analyticsService.getSessionPerformance(userId);

    res.status(200).json({
      success: true,
      data: performanceData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /analytics/delivery-status:
 *   get:
 *     summary: Get delivery status breakdown
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date (ISO string)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date (ISO string)
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: string
 *         description: Filter by session (optional)
 *     responses:
 *       200:
 *         description: Delivery status breakdown retrieved successfully
 */
export const getDeliveryStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { from, to, sessionId } = req.query;

    const fromDate = from ? new Date(from as string) : undefined;
    const toDate = to ? new Date(to as string) : undefined;

    if (from && isNaN(fromDate!.getTime())) {
      throw new AppError("Invalid 'from' date format", 400);
    }

    if (to && isNaN(toDate!.getTime())) {
      throw new AppError("Invalid 'to' date format", 400);
    }

    const deliveryData = await analyticsService.getDeliveryStatus(userId, {
      from: fromDate,
      to: toDate,
      sessionId: sessionId as string,
    });

    res.status(200).json({
      success: true,
      data: deliveryData,
    });
  } catch (error) {
    next(error);
  }
};
