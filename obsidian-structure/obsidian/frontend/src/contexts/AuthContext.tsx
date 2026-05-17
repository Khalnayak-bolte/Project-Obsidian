import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  onIdTokenChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import {
  useAuthStore,
  type AuthUser,
  type WorkspaceAccess,
} from "../stores/authStore";
import { useWorkspaceStore } from "../stores/workspaceStore";
import { useNotificationStore } from "../stores/notificationStore";
import { apiGet } from "../lib/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionBootstrapResponse {
  user: AuthUser;
  workspaceAccess: WorkspaceAccess;
}

interface AuthContextValue {
  isReady: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const {
    setFirebaseUser,
    setUser,
    setWorkspaceAccess,
    setIdToken,
    setStatus,
    setError,
    reset: resetAuth,
  } = useAuthStore();

  const { reset: resetWorkspace } = useWorkspaceStore();
  const { reset: resetNotifications } = useNotificationStore();

  const isReadyRef = useRef(false);

  // ── Bootstrap session after Firebase confirms auth ─────────────────────────

  const bootstrapSession = async (firebaseUser: FirebaseUser): Promise<void> => {
    try {
      setStatus("loading");

      const token = await firebaseUser.getIdToken();
      setIdToken(token);
      setFirebaseUser(firebaseUser);

      const session = await apiGet<SessionBootstrapResponse>(
        "/api/v1/auth/session"
      );

      setUser(session.user);
      setWorkspaceAccess(session.workspaceAccess);
      setStatus("authenticated");
      setError(null);
    } catch (error) {
      console.error("[AuthContext] Session bootstrap failed:", error);
      setError("Failed to load session. Please try again.");
      setStatus("unauthenticated");
    }
  };

  // ── Sign-out cleanup ───────────────────────────────────────────────────────

  const handleSignOut = (): void => {
    resetAuth();
    resetWorkspace();
    resetNotifications();
  };

  // ── Auth state listener ────────────────────────────────────────────────────

  useEffect(() => {
    setStatus("loading");

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await bootstrapSession(firebaseUser);
      } else {
        handleSignOut();
      }
      isReadyRef.current = true;
    });

    return () => unsubscribeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Token refresh listener — keep idToken in sync ─────────────────────────

  useEffect(() => {
    const unsubscribeToken = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          setIdToken(token);
        } catch (error) {
          console.error("[AuthContext] Token refresh failed:", error);
        }
      } else {
        setIdToken(null);
      }
    });

    return () => unsubscribeToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Global auth expiry event (from axios interceptor) ─────────────────────

  useEffect(() => {
    const handleAuthExpired = (): void => {
      console.warn("[AuthContext] Auth expired — signing out");
      handleSignOut();
    };

    window.addEventListener("obsidian:auth:expired", handleAuthExpired);
    return () =>
      window.removeEventListener("obsidian:auth:expired", handleAuthExpired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ isReady: isReadyRef.current }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useAuthContext = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within <AuthProvider>");
  }
  return ctx;
};

export default AuthContext;
