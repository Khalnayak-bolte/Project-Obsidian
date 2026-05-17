/**
 * backend/controllers/authController.ts
 * Project: Obsidian
 *
 * HTTP request handlers for all authentication routes.
 * Validates input via Zod schemas, delegates business logic to authService,
 * and returns consistent ApiSuccess / ApiError responses.
 *
 * Route map (wired in routes/auth.routes.ts):
 *  POST   /api/v1/auth/register          → register
 *  POST   /api/v1/auth/login/oauth       → oauthLogin
 *  POST   /api/v1/auth/logout            → logout
 *  POST   /api/v1/auth/password/reset    → requestPasswordReset
 *  GET    /api/v1/auth/me                → getMe
 *  PATCH  /api/v1/auth/me                → updateProfile
 *  POST   /api/v1/auth/verify-token      → verifyToken
 *  GET    /api/v1/auth/sessions          → listSessions
 *  DELETE /api/v1/auth/sessions/:deviceId → revokeSession
 */
import type { Request, Response, NextFunction } from "express";
export declare function register(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function oauthLogin(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function logout(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function requestPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getMe(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function verifyToken(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function listSessions(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function revokeSession(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function checkEmail(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=authController.d.ts.map