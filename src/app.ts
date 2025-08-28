import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

import routes from "./routes";
import { errorHandler } from "./middlewares/errorHandler";
import { rateLimiter } from "./middlewares/rateLimiter";
import { swaggerOptions } from "./config/swagger";
import { logger } from "./utils/logger";

const app = express();

/*
 * Load up and parse configuration details from
 * the `.env` file to the `process.env`
 * object of Node.js
 */
dotenv.config();

// Security middlewares
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);

// Rate limiting
app.use(rateLimiter);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging
app.use(
  morgan("combined", {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  })
);

// Swagger documentation
const specs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// Routes
app.use("/api/v1", routes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

export default app;
