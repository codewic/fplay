import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/database";
import { AppError } from "../utils/errors";
import { AuthRequest } from "../types";

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      throw new AppError("No token provided", 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new AppError("Invalid token", 401);
    }

    req.user = user;
    next();
  } catch (error) {
    next(new AppError("Authentication failed", 401));
  }
};
