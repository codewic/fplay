import { Request, Response } from "express";
import { prisma } from "../config/database";

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                 uptime:
 *                   type: number
 *                 database:
 *                   type: string
 */
export const healthCheck = async (req: Request, res: Response) => {
  try {
    // Check database connection
    await prisma.$connect();
    const dbStatus = "connected";

    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || "1.0.0",
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: "Database connection failed",
    });
  }
};
