/**
 * backend/services/presenceService.ts
 * Project: Obsidian
 *
 * Manages real-time user presence across workspaces.
 * Handles heartbeats, status transitions (online → away → offline),
 * bulk workspace presence reads, and stale-session cleanup.
 *
 * Presence data lives in two places:
 *  1. users/{uid}               → presenceStatus + lastSeen (fast reads)
 *  2. users/{uid}/presence/{workspaceId} → fine-grained PresenceUpdate doc
 *     (drives Firestore listeners on the frontend)
 */
import type { PresenceStatus } from "../types/workspace";
export interface PresenceRecord {
    uid: string;
    workspaceId: string;
    status: PresenceStatus;
    lastActiveAt: FirebaseFirestore.Timestamp;
    lastHeartbeatAt: FirebaseFirestore.Timestamp;
}
export interface WorkspacePresenceMap {
    [uid: string]: {
        status: PresenceStatus;
        lastActiveAt: FirebaseFirestore.Timestamp;
    };
}
export interface SetPresenceParams {
    uid: string;
    workspaceId: string;
    status: PresenceStatus;
}
export declare function setPresence(params: SetPresenceParams): Promise<PresenceRecord>;
export declare function heartbeat(uid: string, workspaceId: string): Promise<void>;
export declare function getPresence(uid: string, workspaceId: string): Promise<PresenceRecord | null>;
export declare function getWorkspacePresence(workspaceId: string): Promise<WorkspacePresenceMap>;
export declare function markOffline(uid: string, workspaceId: string): Promise<void>;
export declare function markAway(uid: string, workspaceId: string): Promise<void>;
export interface SweepResult {
    markedAway: number;
    markedOffline: number;
}
export declare function sweepStalePresence(): Promise<SweepResult>;
export declare function assertMemberOfWorkspace(uid: string, workspaceId: string): Promise<void>;
export declare function getOnlineMemberCount(workspaceId: string): Promise<number>;
export declare function clearWorkspacePresence(workspaceId: string): Promise<void>;
//# sourceMappingURL=presenceService.d.ts.map