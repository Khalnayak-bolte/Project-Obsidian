/**
 * backend/routes/auth.routes.ts
 * Project: Obsidian
 *
 * Express router for all authentication endpoints.
 * Public routes use rate limiting only.
 * Protected routes additionally require a valid Firebase JWT via authenticate middleware.
 *
 *  POST   /api/v1/auth/register              → register
 *  POST   /api/v1/auth/login/oauth           → oauthLogin
 *  POST   /api/v1/auth/logout                → logout
 *  POST   /api/v1/auth/password/reset        → requestPasswordReset
 *  GET    /api/v1/auth/me                    → getMe
 *  PATCH  /api/v1/auth/me                    → updateProfile
 *  POST   /api/v1/auth/verify-token          → verifyToken
 *  GET    /api/v1/auth/sessions              → listSessions
 *  DELETE /api/v1/auth/sessions/:deviceId    → revokeSession
 *  GET    /api/v1/auth/check-email           → checkEmail
 */
export declare const authRouter: import("express-serve-static-core").Router;
//# sourceMappingURL=auth.routes.d.ts.map