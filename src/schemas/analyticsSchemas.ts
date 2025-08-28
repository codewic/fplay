import z from "zod";

export const analyticsSchemas = {
  dateFilter: z
    .object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
      sessionId: z.string().optional(),
    })
    .refine(
      (data) => {
        if (data.from && data.to) {
          return new Date(data.from) <= new Date(data.to);
        }
        return true;
      },
      {
        message: "From date must be before to date",
        path: ["from"],
      }
    ),
};
