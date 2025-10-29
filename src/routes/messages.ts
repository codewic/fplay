import { Router } from "express";
import {
  getMessages,
  getMessagesByContact,
  sendAnySessionMessage,
} from "../controllers/messageController";
import {
  updateMessageStatus,
  getMessageStats,
  getContactList,
} from "../controllers/messageControllerExtended";
import { authenticate } from "../middlewares/auth";
import { validateRequest } from "../middlewares/validation";
import { messageSchemas } from "../schemas/messageSchemas";

const router = Router();

// router.use(authenticate);

router.get("/:sessionId", getMessages);
router.get("/:sessionId/contact/:remoteJid", getMessagesByContact);
router.get("/:sessionId/stats", getMessageStats);
router.get("/:sessionId/contacts", getContactList);
router.put(
  "/:messageId/status",
  validateRequest(messageSchemas.updateStatus),
  updateMessageStatus
);
router.post(
  "/send-message",
  // validateRequest(messageSchemas.sendAny),
  sendAnySessionMessage
);

export default router;
