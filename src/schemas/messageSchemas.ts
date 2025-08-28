import { z } from "zod";

export const messageSchemas = {
  updateStatus: z.object({
    status: z.enum(["SENT", "DELIVERED", "READ", "FAILED"]),
  }),

  getMessages: z.object({
    page: z.number().int().min(1).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    remoteJid: z.string().optional(),
    status: z.enum(["SENT", "DELIVERED", "READ", "FAILED"]).optional(),
    fromMe: z.boolean().optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    messageType: z.string().optional(),
  }).refine(
    (data) => {
      if (data.dateFrom && data.dateTo) {
        return new Date(data.dateFrom) <= new Date(data.dateTo);
      }
      return true;
    },
    {
      message: "From date must be before to date",
      path: ["dateFrom"], // This will attach the error to the dateFrom field
    }
  ),

  dateFilter: z.object({
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
  }).refine(
    (data) => {
      if (data.dateFrom && data.dateTo) {
        return new Date(data.dateFrom) <= new Date(data.dateTo);
      }
      return true;
    },
    {
      message: "From date must be before to date",
      path: ["dateFrom"],
    }
  ),
};