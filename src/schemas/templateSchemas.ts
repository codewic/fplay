import { z } from "zod";

export const createTemplateSchema = z.object({
  name: z
    .string()
    .min(1, "Template name is required")
    .max(100, "Template name must be less than 100 characters"),
  content: z
    .string()
    .min(1, "Template content is required")
    .max(5000, "Template content must be less than 5000 characters"),
  variables: z.array(z.string()).default([]),
  category: z
    .string()
    .max(50, "Category must be less than 50 characters")
    .optional()
    .or(z.literal("")),
});

export const updateTemplateSchema = z
  .object({
    name: z
      .string()
      .min(1, "Template name cannot be empty")
      .max(100, "Template name must be less than 100 characters")
      .optional(),
    content: z
      .string()
      .min(1, "Template content cannot be empty")
      .max(5000, "Template content must be less than 5000 characters")
      .optional(),
    variables: z.array(z.string()).optional(),
    category: z
      .string()
      .max(50, "Category must be less than 50 characters")
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });
