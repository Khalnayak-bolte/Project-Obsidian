/**
 * frontend/src/services/authService.ts
 * Project: Obsidian
 *
 * All authentication API calls and Firebase Auth operations.
 * Used by AuthContext, useAuth hook, and auth pages.
 * Never touches Zustand directly — returns data, callers update stores.
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  type UserCredential,
} from "firebase/auth";
import { auth, googleProvider, githubProvider } from "../lib/firebase";
import { apiGet, apiPost, apiPatch, apiDelete } from "../lib/axios";
import type { AuthUser, WorkspaceAccess } from "../stores/authStore";

// ─── Response types ───────────────────────────────────────────────────────────

export interface SessionBootstrapResponse {
  user: AuthUser;
  workspaceAccess: WorkspaceAccess;
}

export interface RegisterResponse {
  uid: string;
  email: string;
  displayName: string;
  workspaceId: string;
  roleId: string;
}

// ─── Email / Password ─────────────────────────────────────────────────────────

export async function signInWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    console.error("[authService] signInWithEmail failed:", err);
    throw err;
  }
}

export async function registerWithEmail(params: {
  email: string;
  password: string;
  displayName: string;
  workspaceName?: string;
}): Promise<UserCredential> {
  try {
    // 1. Create Firebase Auth user
    const credential = await createUserWithEmailAndPassword(
      auth,
      params.email,
      params.password
    );

    // 2. Update Firebase display name
    await updateProfile(credential.user, {
      displayName: params.displayName,
    });

    // 3. Send email verification
    await sendEmailVerification(credential.user);

    // 4. Register with backend (creates Firestore profile + workspace)
    await apiPost("/api/v1/auth/register", {
      displayName: params.displayName,
      workspaceName: params.workspaceName,
    });

    return credential;
  } catch (err) {
    console.error("[authService] registerWithEmail failed:", err);
    throw err;
  }
}

// ─── OAuth ────────────────────────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<UserCredential> {
  try {
    const credential = await signInWithPopup(auth, googleProvider);

    // Sync profile with backend on OAuth login
    await apiPost("/api/v1/auth/oauth-login", {
      provider: "google",
      displayName: credential.user.displayName,
      avatarUrl: credential.user.photoURL,
    });

    return credential;
  } catch (err) {
    console.error("[authService] signInWithGoogle failed:", err);
    throw err;
  }
}

export async function signInWithGithub(): Promise<UserCredential> {
  try {
    const credential = await signInWithPopup(auth, githubProvider);

    await apiPost("/api/v1/auth/oauth-login", {
      provider: "github",
      displayName: credential.user.displayName,
      avatarUrl: credential.user.photoURL,
    });

    return credential;
  } catch (err) {
    console.error("[authService] signInWithGithub failed:", err);
    throw err;
  }
}

// ─── Session bootstrap ────────────────────────────────────────────────────────
// Called after Firebase confirms auth — fetches full user + workspace context

export async function bootstrapSession(): Promise<SessionBootstrapResponse> {
  try {
    return await apiGet<SessionBootstrapResponse>("/api/v1/auth/session");
  } catch (err) {
    console.error("[authService] bootstrapSession failed:", err);
    throw err;
  }
}

// ─── Sign out ─────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  try {
    // Revoke device session on backend
    await apiPost("/api/v1/auth/logout").catch(() => {
      // Non-critical — continue with local sign-out
    });

    await firebaseSignOut(auth);
  } catch (err) {
    console.error("[authService] signOut failed:", err);
    throw err;
  }
}

// ─── Sign out all devices ─────────────────────────────────────────────────────

export async function signOutAllDevices(): Promise<void> {
  try {
    await apiPost("/api/v1/auth/logout-all");
    await firebaseSignOut(auth);
  } catch (err) {
    console.error("[authService] signOutAllDevices failed:", err);
    throw err;
  }
}

// ─── Password reset ───────────────────────────────────────────────────────────

export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err) {
    console.error("[authService] requestPasswordReset failed:", err);
    throw err;
  }
}

// ─── Resend email verification ────────────────────────────────────────────────

export async function resendEmailVerification(): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user");
    await sendEmailVerification(user);
  } catch (err) {
    console.error("[authService] resendEmailVerification failed:", err);
    throw err;
  }
}

// ─── Update profile ───────────────────────────────────────────────────────────

export async function updateUserProfile(params: {
  displayName?: string;
  avatarUrl?: string;
}): Promise<void> {
  try {
    // Update Firebase profile
    const user = auth.currentUser;
    if (user) {
      await updateProfile(user, {
        ...(params.displayName && { displayName: params.displayName }),
        ...(params.avatarUrl && { photoURL: params.avatarUrl }),
      });
    }

    // Sync with backend
    await apiPatch("/api/v1/auth/profile", params);
  } catch (err) {
    console.error("[authService] updateUserProfile failed:", err);
    throw err;
  }
}

// ─── Get current Firebase ID token ───────────────────────────────────────────

export async function getIdToken(forceRefresh = false): Promise<string | null> {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken(forceRefresh);
  } catch (err) {
    console.error("[authService] getIdToken failed:", err);
    return null;
  }
}

// ─── Delete account ───────────────────────────────────────────────────────────

export async function deleteAccount(): Promise<void> {
  try {
    // Delete from backend first
    await apiDelete("/api/v1/auth/account");

    // Then delete Firebase Auth user
    const user = auth.currentUser;
    if (user) await user.delete();
  } catch (err) {
    console.error("[authService] deleteAccount failed:", err);
    throw err;
  }
}

// ─── Error message mapper ─────────────────────────────────────────────────────
// Maps Firebase error codes to user-friendly messages

export function getAuthErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/popup-closed-by-user": "Sign-in was cancelled.",
    "auth/cancelled-popup-request": "Sign-in was cancelled.",
    "auth/network-request-failed": "Network error. Please check your connection.",
    "auth/account-exists-with-different-credential":
      "An account already exists with this email using a different sign-in method.",
    "auth/requires-recent-login":
      "Please sign in again to complete this action.",
    "auth/invalid-credential": "Invalid credentials. Please try again.",
  };

  return messages[code] ?? "Something went wrong. Please try again.";
}
