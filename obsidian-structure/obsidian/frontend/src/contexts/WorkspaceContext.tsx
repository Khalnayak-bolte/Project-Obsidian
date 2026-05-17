import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuthStore, selectWorkspaceId } from "../stores/authStore";
import {
  useWorkspaceStore,
  type Workspace,
  type Channel,
  type WorkspaceMember,
  type PresenceStatus,
  type Role,
} from "../stores/workspaceStore";

// ─── Context Value ────────────────────────────────────────────────────────────

interface WorkspaceContextValue {
  subscribeToWorkspace: (workspaceId: string) => void;
  unsubscribeAll: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface WorkspaceProviderProps {
  children: ReactNode;
}

export const WorkspaceProvider = ({ children }: WorkspaceProviderProps) => {
  const workspaceId = useAuthStore(selectWorkspaceId);

  const {
    setCurrentWorkspace,
    setChannels,
    upsertChannel,
    removeChannel,
    setMembers,
    upsertMember,
    removeMember,
    setRoles,
    setPresence,
    setIsLoadingWorkspace,
    setIsLoadingChannels,
    setIsLoadingMembers,
    reset,
  } = useWorkspaceStore();

  // Track active Firestore unsubscribe functions
  const unsubsRef = useRef<Unsubscribe[]>([]);

  const addUnsub = (unsub: Unsubscribe): void => {
    unsubsRef.current.push(unsub);
  };

  const unsubscribeAll = useCallback((): void => {
    unsubsRef.current.forEach((unsub) => unsub());
    unsubsRef.current = [];
  }, []);

  // ── Workspace doc listener ─────────────────────────────────────────────────

  const subscribeToWorkspaceDoc = (wsId: string): void => {
    setIsLoadingWorkspace(true);
    const unsub = onSnapshot(
      doc(db, "workspaces", wsId),
      (snap) => {
        if (snap.exists()) {
          setCurrentWorkspace({ workspaceId: snap.id, ...snap.data() } as Workspace);
        }
        setIsLoadingWorkspace(false);
      },
      (error) => {
        console.error("[WorkspaceContext] Workspace doc listener error:", error);
        setIsLoadingWorkspace(false);
      }
    );
    addUnsub(unsub);
  };

  // ── Channels listener ──────────────────────────────────────────────────────

  const subscribeToChannels = (wsId: string): void => {
    setIsLoadingChannels(true);
    const q = query(
      collection(db, "channels"),
      where("workspaceId", "==", wsId),
      where("isArchived", "==", false),
      orderBy("position", "asc")
    );

    let isFirst = true;
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (isFirst) {
          // Initial load — set all at once
          const channels = snap.docs.map(
            (d) => ({ channelId: d.id, ...d.data() } as Channel)
          );
          setChannels(channels);
          isFirst = false;
          setIsLoadingChannels(false);
          return;
        }

        // Incremental updates
        snap.docChanges().forEach((change) => {
          const channel = { channelId: change.doc.id, ...change.doc.data() } as Channel;
          if (change.type === "added" || change.type === "modified") {
            upsertChannel(channel);
          } else if (change.type === "removed") {
            removeChannel(channel.channelId);
          }
        });
      },
      (error) => {
        console.error("[WorkspaceContext] Channels listener error:", error);
        setIsLoadingChannels(false);
      }
    );
    addUnsub(unsub);
  };

  // ── Members listener ───────────────────────────────────────────────────────

  const subscribeToMembers = (wsId: string): void => {
    setIsLoadingMembers(true);
    const q = query(
      collection(db, "users"),
      where("workspaceId", "==", wsId),
      where("status", "==", "active")
    );

    let isFirst = true;
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (isFirst) {
          const members = snap.docs.map(
            (d) => ({ uid: d.id, ...d.data() } as WorkspaceMember)
          );
          setMembers(members);
          isFirst = false;
          setIsLoadingMembers(false);
          return;
        }

        snap.docChanges().forEach((change) => {
          const member = { uid: change.doc.id, ...change.doc.data() } as WorkspaceMember;
          if (change.type === "added" || change.type === "modified") {
            upsertMember(member);
          } else if (change.type === "removed") {
            removeMember(member.uid);
          }
        });
      },
      (error) => {
        console.error("[WorkspaceContext] Members listener error:", error);
        setIsLoadingMembers(false);
      }
    );
    addUnsub(unsub);
  };

  // ── Roles listener ─────────────────────────────────────────────────────────

  const subscribeToRoles = (wsId: string): void => {
    const q = query(
      collection(db, "roles"),
      where("workspaceId", "==", wsId),
      orderBy("position", "asc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const roles = snap.docs.map(
          (d) => ({ roleId: d.id, ...d.data() } as Role)
        );
        setRoles(roles);
      },
      (error) => {
        console.error("[WorkspaceContext] Roles listener error:", error);
      }
    );
    addUnsub(unsub);
  };

  // ── Presence listener ──────────────────────────────────────────────────────

  const subscribeToPresence = (wsId: string): void => {
    const q = query(
      collection(db, "presence"),
      where("workspaceId", "==", wsId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        snap.docChanges().forEach((change) => {
          const data = change.doc.data();
          if (data?.uid && data?.status) {
            setPresence(data.uid as string, data.status as PresenceStatus);
          }
        });
      },
      (error) => {
        console.error("[WorkspaceContext] Presence listener error:", error);
      }
    );
    addUnsub(unsub);
  };

  // ── Subscribe all ──────────────────────────────────────────────────────────

  const subscribeToWorkspace = useCallback(
    (wsId: string): void => {
      unsubscribeAll();
      subscribeToWorkspaceDoc(wsId);
      subscribeToChannels(wsId);
      subscribeToMembers(wsId);
      subscribeToRoles(wsId);
      subscribeToPresence(wsId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unsubscribeAll]
  );

  // ── Auto-subscribe when workspaceId is available ───────────────────────────

  useEffect(() => {
    if (!workspaceId) {
      unsubscribeAll();
      reset();
      return;
    }

    subscribeToWorkspace(workspaceId);

    return () => unsubscribeAll();
  }, [workspaceId, subscribeToWorkspace, unsubscribeAll, reset]);

  return (
    <WorkspaceContext.Provider value={{ subscribeToWorkspace, unsubscribeAll }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useWorkspaceContext = (): WorkspaceContextValue => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspaceContext must be used within <WorkspaceProvider>");
  }
  return ctx;
};

export default WorkspaceContext;
