/**
 * backend/middleware/loggingMiddleware.ts
 * Project: Obsidian
 *
 * HTTP request/response logging middleware.
 * Attaches a unique requestId to every request, logs inbound metadata,
 * then logs the outbound result (status, latency) once the response finishes.
 * Structured JSON in production (CloudWatch-friendly); coloured dev output otherwise.
 */
import type { Request, Response, NextFunction } from "express";
export declare function attachRequestId(req: Request, _res: Response, next: NextFunction): void;
export declare function loggingMiddleware(req: Request, res: Response, next: NextFunction): void;
export declare function httpLogger(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=loggingMiddleware.d.ts.map