import { Request, Response, NextFunction } from "express";
import { ZodError, ZodSchema } from "zod";
import { AppError } from "../utils/errors";

export const validateRequest =
  (schema: ZodSchema) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues.map((e) => e.message).join(", ");
        next(new AppError(message, 400));
      } else {
        next(new AppError("An unexpected validation error occurred", 500));
      }
    }
  };
