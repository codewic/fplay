import { Router } from "express";
import { analyticsSchemas } from "../schemas/analyticsSchemas";
import * as analyticsController from "../controllers/analyticsController";
import { validateRequest } from "../middlewares/validation";
import { authenticate } from "../middlewares/auth";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Analytics routes
router.get(
  "/metrics",
  validateRequest(analyticsSchemas.dateFilter),
  analyticsController.getMetrics
);
router.get(
  "/message-volume",
  validateRequest(analyticsSchemas.dateFilter),
  analyticsController.getMessageVolume
);
router.get("/session-performance", analyticsController.getSessionPerformance);
router.get(
  "/delivery-status",
  validateRequest(analyticsSchemas.dateFilter),
  analyticsController.getDeliveryStatus
);

export default router;
