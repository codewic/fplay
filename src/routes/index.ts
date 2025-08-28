import { Router } from "express";
import sessionRoutes from "./sessions";
import authRoutes from "./auth";
import messageRoutes from "./messages";
import healthRoutes from "./health";
import templateRoutes from "./templates";
import analyticsRoutes from "./analytics";
import userRoutes from "./user";

const router = Router();

router.use("/auth", authRoutes);
router.use("/sessions", sessionRoutes);
router.use("/messages", messageRoutes);
router.use("/templates", templateRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/user", userRoutes);
router.use("/health", healthRoutes);

export default router;
