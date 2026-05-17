/**
 * backend/routes/voice.routes.ts
 * Project: Obsidian
 *
 * Express router for all voice channel endpoints.
 * All routes require a valid Firebase JWT via authenticate middleware.
 *
 *  POST   /api/v1/voice/join                                    → joinVoice
 *  POST   /api/v1/voice/leave                                   → leaveVoice
 *  GET    /api/v1/voice/session                                 → getActiveSession
 *  GET    /api/v1/voice/presence                                → getVoicePresence
 *  PATCH  /api/v1/voice/participant                             → updateParticipantState
 *  POST   /api/v1/voice/mute/:uid                               → muteParticipant
 *  POST   /api/v1/voice/kick/:uid                               → kickParticipant
 *  POST   /api/v1/voice/end                                     → endVoiceSession
 *  POST   /api/v1/voice/heartbeat                               → heartbeat
 *  POST   /api/v1/voice/quality                                 → reportQualityStats
 */
export declare const voiceRouter: import("express-serve-static-core").Router;
//# sourceMappingURL=voice.routes.d.ts.map