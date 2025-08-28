import app from "./app";
import { createServer } from "http";
import { logger } from "./utils/logger";
import { PrismaClient } from "./generated/prisma";
import { whatsappService } from "./services/whatsappService";
import { socketService } from "./services/socketService";

const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info("Database connected successfully");

    // Create HTTP server
    const server = createServer(app);

    // Initialize Socket.IO
    socketService.initialize(server);

    // Temporarily disable WhatsApp session restoration to fix logger issue
    await whatsappService.restoreSessions();
    logger.info("WhatsApp session restoration Done");

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`Socket.IO server initialized`);
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      logger.info("SIGTERM received, shutting down gracefully");
      server.close(() => {
        prisma.$disconnect();
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      logger.info("SIGINT received, shutting down gracefully");
      server.close(() => {
        prisma.$disconnect();
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
