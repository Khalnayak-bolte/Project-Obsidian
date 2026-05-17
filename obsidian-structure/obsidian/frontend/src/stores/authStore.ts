import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { User as FirebaseUser } from "firebase/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthProvider = "email" | "google" | "github" | "magic_link";

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  emailVerified: boolean;
  provider: AuthProvider;
}

export interface WorkspaceAccess {
  workspaceId: string;
  roleId: string;
  permissions: Record<string, boolean>;
}

export type AuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "suspended";

// ─── State Interface ──────────────────────────────────────────────────────────

interface AuthState {
  // State
  status: AuthStatus;
  user: AuthUser | null;
  firebaseUser: FirebaseUser | null;
  workspaceAccess: WorkspaceAccess | null;
  idToken: string | null;
  error: string | null;

  // Actions
  setFirebaseUser: (firebaseUser: FirebaseUser | null) => void;
  setUser: (user: AuthUser | null) => void;
  setWorkspaceAccess: (access: WorkspaceAccess | null) => void;
  setIdToken: (token: string | null) => void;
  setStatus: (status: AuthStatus) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
  status: "idle" as AuthStatus,
  user: null,
  firebaseUser: null,
  workspaceAccess: null,
  idToken: null,
  error: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setFirebaseUser: (firebaseUser) =>
          set({ firebaseUser }, false, "auth/setFirebaseUser"),

        setUser: (user) =>
          set({ user }, false, "auth/setUser"),

        setWorkspaceAccess: (workspaceAccess) =>
          set({ workspaceAccess }, false, "auth/setWorkspaceAccess"),

        setIdToken: (idToken) =>
          set({ idToken }, false, "auth/setIdToken"),

        setStatus: (status) =>
          set({ status }, false, "auth/setStatus"),

        setError: (error) =>
          set({ error }, false, "auth/setError"),

        reset: () =>
          set(
            { ...initialState, status: "unauthenticated" },
            false,
            "auth/reset"
          ),
      }),
      {
        name: "obsidian:auth",
        // Only persist non-sensitive, non-reactive fields
        partialize: (state) => ({
          user: state.user,
          workspaceAccess: state.workspaceAccess,
        }),
      }
    ),
    { name: "AuthStore" }
  )
);

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectIsAuthenticated = (state: AuthState): boolean =>
  state.status === "authenticated" && state.user !== null;

export const selectIsLoading = (state: AuthState): boolean =>
  state.status === "idle" || state.status === "loading";

export const selectCurrentUser = (state: AuthState): AuthUser | null =>
  state.user;

export const selectPermissions = (
  state: AuthState
): Record<string, boolean> =>
  state.workspaceAccess?.permissions ?? {};

export const selectHasPermission =
  (permission: string) =>
  (state: AuthState): boolean =>
    state.workspaceAccess?.permissions?.[permission] === true;

export const selectWorkspaceId = (state: AuthState): string | null =>
  state.workspaceAccess?.workspaceId ?? null;

export const selectRoleId = (state: AuthState): string | null =>
  state.workspaceAccess?.roleId ?? null;
