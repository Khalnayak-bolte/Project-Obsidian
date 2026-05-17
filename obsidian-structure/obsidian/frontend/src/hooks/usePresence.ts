/**
 * frontend/src/hooks/usePresence.ts
 * Project: Obsidian
 *
 * Manages local user presence (online/away/busy/offline) and subscribes
 * to real-time member presence updates from Firestore.
 * Sends heartbeats every 30s and sets offline on page visibility change.
 */

import { useEffect, useRef, useCallback } from "react";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuthStore } from "../stores/authStore";
import { useWorkspaceStore, type PresenceStatus } from "../stores/workspaceStore";
import { apiClient } from "../lib/axios";

// ─── Constants ────────────────────────────────────────────────────────────────

const HEARTBEAT_INTERVAL_MS = 30_000;
const AWAY_TIMEOUT_MS = 5 * 60 * 1000;       // 5 minutes idle → away
const FIRESTORE_USERS_COLLECTION = "users";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePresence() {
  const { user } = useAuthStore();
  const { currentWorkspace, members, updateMemberPresence } = useWorkspaceStore();

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const awayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceSnapshotRef = useRef<Unsubscribe | null>(null);
  const currentStatusRef = useRef<PresenceStatus>("online");

  // ─── Update presence via API ────────────────────────────────────────────────

  const updatePresence = useCallback(
    async (status: PresenceStatus) => {
      if (!user || !currentWorkspace) return;
      if (currentStatusRef.current === status) return;

      currentStatusRef.current = status;

      try {
        await apiClient.patch("/api/v1/workspaces/presence", { status });
      } catch (err) {
        console.error("[usePresence] updatePresence failed:", err);
      }
    },
    [user, currentWorkspace]
  );

  // ─── Reset away timer on activity ──────────────────────────────────────────

  const resetAwayTimer = useCallback(() => {
    if (awayTimerRef.current) clearTimeout(awayTimerRef.current);

    // If currently away, snap back to online
    if (currentStatusRef.current === "away") {
      updatePresence("online");
    }

    awayTimerRef.current = setTimeout(() => {
      // Only go away if not manually set to busy/offline
      if (currentStatusRef.current === "online") {
        updatePresence("away");
      }
    }, AWAY_TIMEOUT_MS);
  }, [updatePresence]);

  // ─── Set status manually ────────────────────────────────────────────────────

  const setStatus = useCallback(
    async (status: PresenceStatus) => {
      // Clear away timer if user manually sets status
      if (awayTimerRef.current) clearTimeout(awayTimerRef.current);
      await updatePresence(status);
    },
    [updatePresence]
  );

  // ─── Heartbeat ──────────────────────────────────────────────────────────────

  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    heartbeatRef.current = setInterval(async () => {
      if (!user || !currentWorkspace) return;
      try {
        await apiClient.patch("/api/v1/workspaces/presence", {
          status: currentStatusRef.current,
        });
      } catch (err) {
        console.error("[usePresence] heartbeat failed:", err);
      }
    }, HEARTBEAT_INTERVAL_MS);
  }, [user, currentWorkspace]);

  // ─── Subscribe to workspace member presence via Firestore ──────────────────

  const subscribeToMemberPresence = useCallback(() => {
    if (!currentWorkspace) return;

    // Unsubscribe from previous workspace
    if (presenceSnapshotRef.current) {
      presenceSnapshotRef.current();
      presenceSnapshotRef.current = null;
    }

    const membersQuery = query(
      collection(db, FIRESTORE_USERS_COLLECTION),
      where("workspaceId", "==", currentWorkspace.workspaceId)
    );

    presenceSnapshotRef.current = onSnapshot(
      membersQuery,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "modified" || change.type === "added") {
            const data = change.doc.data();
            if (data.uid && data.status) {
              updateMemberPresence(data.uid, data.status as PresenceStatus);
            }
          }
        });
      },
      (err) => {
        console.error("[usePresence] Firestore presence snapshot error:", err);
      }
    );
  }, [currentWorkspace, updateMemberPresence]);

  // ─── Page visibility handling ───────────────────────────────────────────────

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (awayTimerRef.current) clearTimeout(awayTimerRef.current);
        updatePresence("away");
      } else {
        updatePresence("online");
        resetAwayTimer();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [updatePresence, resetAwayTimer]);

  // ─── Activity detection (mouse/keyboard) ───────────────────────────────────

  useEffect(() => {
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    const handleActivity = () => resetAwayTimer();

    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
    };
  }, [resetAwayTimer]);

  // ─── Page unload → set offline ─────────────────────────────────────────────

  useEffect(() => {
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable delivery on page close
      const url = `${import.meta.env.VITE_API_BASE_URL}/api/v1/workspaces/presence`;
      navigator.sendBeacon(url, JSON.stringify({ status: "offline" }));
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // ─── Initialize on mount / workspace change ────────────────────────────────

  useEffect(() => {
    if (!user || !currentWorkspace) return;

    // Go online
    updatePresence("online");
    startHeartbeat();
    resetAwayTimer();
    subscribeToMemberPresence();

    return () => {
      // Cleanup on workspace switch / unmount
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (awayTimerRef.current) clearTimeout(awayTimerRef.current);
      if (presenceSnapshotRef.current) presenceSnapshotRef.current();
    };
  }, [user?.uid, currentWorkspace?.workspaceId]);

  // ─── Get presence for a specific member ────────────────────────────────────

  const getMemberPresence = useCallback(
    (uid: string): PresenceStatus => {
      const member = members.find((m) => m.uid === uid);
      return member?.presenceStatus ?? "offline";
    },
    [members]
  );

  // ─── Get online member count ────────────────────────────────────────────────

  const onlineMemberCount = members.filter(
    (m) => m.presenceStatus === "online" || m.presenceStatus === "away"
  ).length;

  return {
    currentStatus: currentStatusRef.current,
    setStatus,
    getMemberPresence,
    onlineMemberCount,
    members,
  };
}
