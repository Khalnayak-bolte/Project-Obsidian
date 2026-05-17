/**
 * Obsidian Backend - Main Server Entry Point
 * 
 * This file initializes the Express server and connects all routes,
 * middleware, and services.
 */

import express, { type Application, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { createLogger } from "../utils/logger.js";
import { AppError } from "../middleware/errorMiddleware.js";
import { HTTP_STATUS, ERROR_CODES } from "../types/common.js";

// Import routes - named exports
import { authRouter } from "../routes/auth.routes.js";
import { workspaceRouter } from "../routes/workspace.routes.js";
import { channelRouter } from "../routes/channel.routes.js";
import { messageRouter } from "../routes/message.routes.js";
import { fileRouter } from "../routes/file.routes.js";
import { voiceRouter } from "../routes/voice.routes.js";
import { paymentRouter } from "../routes/payment.routes.js";
import { adminRouter } from "../routes/admin.routes.js";

// Import middleware
import { authenticate } from "../middleware/authMiddleware.js";

const logger = createLogger("server");

// Simple logging middleware
const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  next();
};

// Simple rate limiting middleware
const rateLimitMiddleware = (_req: Request, _res: Response, next: NextFunction) => {
  next(); // Placeholder - implement with actual rate limiting if needed
};

// Create Express app
const app: Application = express();
const PORT = parseInt(process.env.PORT || "4000", 10);

// ─── Middleware ─────────────────────────────────────────────────────────────

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));

// Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging
app.use(loggingMiddleware);

// Rate limiting
app.use(rateLimitMiddleware);

// ─── Health Check ───────────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.status(HTTP_STATUS.OK).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/", (_req: Request, res: Response) => {
  res.status(HTTP_STATUS.OK).json({
    name: "Obsidian Backend API",
    version: "1.0.0",
    documentation: "/api/v1",
  });
});

// ─── API Routes ─────────────────────────────────────────────────────────────

// Public routes
app.use("/api/v1/auth", authRouter);

// Protected routes (require authentication)
app.use("/api/v1/workspaces", authenticate, workspaceRouter);
app.use("/api/v1/channels", authenticate, channelRouter);
app.use("/api/v1/messages", authenticate, messageRouter);
app.use("/api/v1/files", authenticate, fileRouter);
app.use("/api/v1/voice", authenticate, voiceRouter);
app.use("/api/v1/payments", authenticate, paymentRouter);
app.use("/api/v1/admin", authenticate, adminRouter);

// ─── Error Handling ─────────────────────────────────────────────────────────

// 404 handler
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(ERROR_CODES.NOT_FOUND, "Route not found"));
});

// Global error handler
app.use((err: Error | AppError, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    logger.error(`[${err.code}] ${err.message}`);
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
  } else {
    logger.error("Unexpected error:", err);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    });
  }
});

// ─── Server Start ───────────────────────────────────────────────────────────

const startServer = (): void => {
  app.listen(PORT, () => {
    logger.info(`🚀 Obsidian API running on port ${PORT}`);
    logger.info(`   Environment: ${process.env.NODE_ENV || "development"}`);
    logger.info(`   Health check: http://localhost:${PORT}/health`);
  });
};

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection:", reason);
  process.exit(1);
});

// Export for testing
export default app;

// Start server if run directly
if (require.main === module) {
  startServer();
}