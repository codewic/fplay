import { Router } from "express";
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "../controllers/templateController";
import { authenticate } from "../middlewares/auth";
import { validateRequest } from "../middlewares/validation";
import { createTemplateSchema, updateTemplateSchema } from "../schemas/templateSchemas";

const router = Router();

// Apply authentication to all template routes
router.use(authenticate);

router.get("/", getTemplates);
router.get("/:templateId", getTemplate);
router.post("/", validateRequest(createTemplateSchema), createTemplate);
router.put("/:templateId", validateRequest(updateTemplateSchema), updateTemplate);
router.delete("/:templateId", deleteTemplate);

export default router;
