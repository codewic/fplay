import { Router } from "express";
import { register, login, refreshToken, refreshTokens, logout } from "../controllers/authController";
import { authenticate } from "../middlewares/auth";
import { validateRequest } from "../middlewares/validation";
import { registerSchema, loginSchema, refreshTokenSchema } from "../schemas/authSchemas";

const router = Router();

router.post("/register", validateRequest(registerSchema), register);
router.post("/login", validateRequest(loginSchema), login);
router.post("/refresh", validateRequest(refreshTokenSchema), refreshTokens);
router.post("/refresh-legacy", authenticate, refreshToken);
router.post("/logout", authenticate, logout);

export default router;
