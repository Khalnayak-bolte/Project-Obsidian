import { useCallback } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  type UserCredential,
} from "firebase/auth";
import { auth, googleProvider, githubProvider } from "../lib/firebase";
import { useAuthStore, selectIsAuthenticated, selectCurrentUser } from "../stores/authStore";
import { apiPost } from "../lib/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
  workspaceName?: string;
}

interface RegisterResponse {
  uid: string;
  workspaceId: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useAuth = () => {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore(selectCurrentUser);
  const workspaceAccess = useAuthStore((s) => s.workspaceAccess);
  const error = useAuthStore((s) => s.error);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const setError = useAuthStore((s) => s.setError);
  const setStatus = useAuthStore((s) => s.setStatus);

  // ── Email / Password Sign In ───────────────────────────────────────────────

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<UserCredential | null> => {
      try {
        setStatus("loading");
        setError(null);
        const credential = await signInWithEmailAndPassword(auth, email, password);
        return credential;
      } catch (error) {
        console.error("[useAuth] Email sign-in failed:", error);
        const err = error as { code?: string };
        const message = mapFirebaseError(err.code);
        setError(message);
        setStatus("unauthenticated");
        return null;
      }
    },
    [setError, setStatus]
  );

  // ── Email / Password Register ──────────────────────────────────────────────

  const registerWithEmail = useCallback(
    async (payload: RegisterPayload): Promise<boolean> => {
      try {
        setStatus("loading");
        setError(null);

        const credential = await createUserWithEmailAndPassword(
          auth,
          payload.email,
          payload.password
        );

        // Set display name on Firebase profile
        await updateProfile(credential.user, {
          displayName: payload.displayName,
        });

        // Create user + workspace on backend
        await apiPost<RegisterResponse>("/api/v1/auth/register", {
          uid: credential.user.uid,
          email: payload.email,
          displayName: payload.displayName,
          workspaceName: payload.workspaceName,
        });

        return true;
      } catch (error) {
        console.error("[useAuth] Registration failed:", error);
        const err = error as { code?: string };
        const message = mapFirebaseError(err.code);
        setError(message);
        setStatus("unauthenticated");
        return false;
      }
    },
    [setError, setStatus]
  );

  // ── Google OAuth ───────────────────────────────────────────────────────────

  const signInWithGoogle = useCallback(async (): Promise<UserCredential | null> => {
    try {
      setStatus("loading");
      setError(null);
      const credential = await signInWithPopup(auth, googleProvider);
      return credential;
    } catch (error) {
      console.error("[useAuth] Google sign-in failed:", error);
      const err = error as { code?: string };
      if (err.code !== "auth/popup-closed-by-user") {
        setError(mapFirebaseError(err.code));
      }
      setStatus("unauthenticated");
      return null;
    }
  }, [setError, setStatus]);

  // ── GitHub OAuth ───────────────────────────────────────────────────────────

  const signInWithGithub = useCallback(async (): Promise<UserCredential | null> => {
    try {
      setStatus("loading");
      setError(null);
      const credential = await signInWithPopup(auth, githubProvider);
      return credential;
    } catch (error) {
      console.error("[useAuth] GitHub sign-in failed:", error);
      const err = error as { code?: string };
      if (err.code !== "auth/popup-closed-by-user") {
        setError(mapFirebaseError(err.code));
      }
      setStatus("unauthenticated");
      return null;
    }
  }, [setError, setStatus]);

  // ── Sign Out ───────────────────────────────────────────────────────────────

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await apiPost("/api/v1/auth/logout").catch(() => {
        // Non-critical — proceed even if backend logout fails
      });
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("[useAuth] Sign-out failed:", error);
    }
  }, []);

  // ── Password Reset ─────────────────────────────────────────────────────────

  const sendPasswordReset = useCallback(
    async (email: string): Promise<boolean> => {
      try {
        await sendPasswordResetEmail(auth, email);
        return true;
      } catch (error) {
        console.error("[useAuth] Password reset failed:", error);
        const err = error as { code?: string };
        setError(mapFirebaseError(err.code));
        return false;
      }
    },
    [setError]
  );

  // ── Clear Error ────────────────────────────────────────────────────────────

  const clearError = useCallback(() => setError(null), [setError]);

  return {
    // State
    status,
    user,
    workspaceAccess,
    error,
    isAuthenticated,
    isLoading: status === "idle" || status === "loading",
    isSuspended: status === "suspended",

    // Actions
    signInWithEmail,
    registerWithEmail,
    signInWithGoogle,
    signInWithGithub,
    signOut,
    sendPasswordReset,
    clearError,
  };
};

// ─── Firebase Error Map ───────────────────────────────────────────────────────

const mapFirebaseError = (code?: string): string => {
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with a different sign-in method.";
    case "auth/popup-blocked":
      return "Popup was blocked. Please allow popups for this site.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact support.";
    default:
      return "Something went wrong. Please try again.";
  }
};
