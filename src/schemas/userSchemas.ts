import { z } from "zod";


export const userSchemas = {
  updateProfile: z
    .object({
      name: z.string().min(2).max(100).optional(),
      email: z.string().email().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),

  updateSettings: z
    .object({
      notificationSettings: z
        .object({
          emailNotifications: z.boolean().optional(),
          pushNotifications: z.boolean().optional(),
          messageAlerts: z.boolean().optional(),
          sessionAlerts: z.boolean().optional(),
        })
        .optional(),
      apiSettings: z
        .object({
          rateLimit: z.number().int().min(1).max(1000).optional(),
          webhookUrl: z.string().url().nullable().optional(),
          allowedIPs: z.array(z.string()).optional(),
        })
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
};
