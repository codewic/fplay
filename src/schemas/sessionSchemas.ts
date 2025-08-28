import { z } from "zod";

export const sendMessageSchema = z.object({
  body: z.object({
    to: z.string().min(10, "Phone number must be at least 10 characters"),
    message: z.string().min(1, "Message cannot be empty"),
    type: z.enum(["text", "image", "document"]).optional().default("text"),
  }),
});
