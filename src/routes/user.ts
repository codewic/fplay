import { Router } from "express";
import { userController } from "../controllers/userController";
import { authenticate } from "../middlewares/auth";
import { validateRequest } from "../middlewares/validation";
import { userSchemas } from "../schemas/userSchemas";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// User profile routes
router.get("/profile", userController.getProfile);
router.put(
  "/profile",
  validateRequest(userSchemas.updateProfile),
  userController.updateProfile
);

// User settings routes
router.get("/settings", userController.getSettings);
router.put(
  "/settings",
  validateRequest(userSchemas.updateSettings),
  userController.updateSettings
);

// API key management
router.post("/api-key", userController.generateApiKey);

// Account management
router.delete("/account", userController.deleteAccount);

export default router;
