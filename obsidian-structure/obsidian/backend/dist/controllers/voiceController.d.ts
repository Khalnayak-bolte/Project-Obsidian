/**
 * backend/controllers/voiceController.ts
 * Project: Obsidian
 *
 * HTTP request handlers for all voice routes.
 * Validates input via Zod schemas, delegates to voiceService,
 * and returns consistent ApiSuccess / ApiError responses.
 *
 * Route map (wired in routes/voice.routes.ts):
 *  POST   /api/v1/voice/join                              → joinVoice
 *  POST   /api/v1/voice/leave                             → leaveVoice
 *  GET    /api/v1/voice/:channelId/session                → getActiveSession
 *  GET    /api/v1/voice/:channelId/presence               → getVoicePresence
 *  PATCH  /api/v1/voice/:channelId/state                  → updateParticipantState
 *  POST   /api/v1/voice/:channelId/mute                   → muteParticipant
 *  POST   /api/v1/voice/:channelId/kick                   → kickParticipant
 *  POST   /api/v1/voice/:sessionId/end                    → endVoiceSession
 *  POST   /api/v1/voice/heartbeat                         → heartbeat
 *  POST   /api/v1/voice/stats                             → reportQualityStats
 */
import type { Request, Response, NextFunction } from "express";
export declare function joinVoice(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function leaveVoice(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getActiveSession(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getVoicePresence(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function updateParticipantState(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function muteParticipant(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function kickParticipant(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function endVoiceSession(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function heartbeat(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function reportQualityStats(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=voiceController.d.ts.map