/**
 * backend/middleware/authMiddleware.ts
 * Project: Obsidian
 */
import type { Request, Response, NextFunction } from "express";
/**
 * Verifies the Firebase ID token and attaches `req.user` (UserSession).
 * All protected routes must use this middleware first.
 */
export declare function authenticate(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Same as `authenticate` but also checks token revocation.
 * Use on sensitive operations: billing changes, ownership transfer, deletion.
 */
export declare function authenticateStrict(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Attempts token verification but does not block the request on failure.
 * Attaches `req.user` if valid; leaves it undefined otherwise.
 * Use on public routes that have optional authenticated behaviour.
 */
export declare function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void>;
/**
 * Ensures the authenticated user belongs to the workspace specified in
 * `req.params.workspaceId`, `req.body.workspaceId`, or `req.query.workspaceId`.
 * Must be placed after `authenticate`.
 */
export declare function requireWorkspace(req: Request, res: Response, next: NextFunction): void;
/**
 * Blocks access if the user's email is not verified.
 * Must be placed after `authenticate`.
 */
export declare function requireEmailVerified(req: Request, res: Response, next: NextFunction): void;
/**
 * Ensures the authenticated user is the workspace owner.
 * Looks up the workspace document to verify ownership.
 * Must be placed after `authenticate` and `requireWorkspace`.
 */
export declare function requireOwner(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=authMiddleware.d.ts.map