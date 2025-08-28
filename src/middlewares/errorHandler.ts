import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err } as AppError;
  error.message = err.message;

  // Log error
  logger.error(err);

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found";
    error = new AppError(message, 404);
  }

  // Prisma errors
  if (err.name === "PrismaClientKnownRequestError") {
    error = new AppError("Database error", 400);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error = new AppError("Invalid token", 401);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || "Server Error",
  });
};
