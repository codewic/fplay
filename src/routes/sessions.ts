import { Router } from "express";
import {
  startSession,
  startSessionWithPhone,
  getSessionStatus,
  sendMessage,
  disconnectSession,
  getUserSessions,
} from "../controllers/sessionController";
import { authenticate } from "../middlewares/auth";
import { validateRequest } from "../middlewares/validation";
import { sendMessageSchema } from "../schemas/sessionSchemas";

const router = Router();

// Apply authentication to all session routes
router.use(authenticate);

router.post("/start", startSession);
router.post("/start-with-phone", startSessionWithPhone);
router.get("/", getUserSessions);
router.get("/:sessionId", getSessionStatus);
router.post(
  "/:sessionId/message",
  validateRequest(sendMessageSchema),
  sendMessage
);
router.delete("/:sessionId", disconnectSession);

export default router;
