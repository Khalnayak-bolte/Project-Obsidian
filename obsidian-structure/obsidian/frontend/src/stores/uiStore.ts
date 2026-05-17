import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Theme = "dark" | "light" | "system";
export type SidebarTab = "channels" | "dms" | "members" | "notifications";

export type ModalType =
  | "create-channel"
  | "edit-channel"
  | "delete-channel"
  | "invite-member"
  | "edit-member-role"
  | "remove-member"
  | "create-workspace"
  | "edit-workspace"
  | "delete-workspace"
  | "checkout"
  | "upgrade"
  | "file-preview"
  | "image-preview"
  | "confirm-action"
  | "keyboard-shortcuts"
  | null;

export interface ModalPayload {
  channelId?: string;
  workspaceId?: string;
  memberId?: string;
  fileUrl?: string;
  fileName?: string;
  confirmTitle?: string;
  confirmMessage?: string;
  onConfirm?: () => void | Promise<void>;
  [key: string]: unknown;
}

// ─── State Interface ──────────────────────────────────────────────────────────

interface UIState {
  // Theme
  theme: Theme;

  // Sidebar
  isSidebarOpen: boolean;
  sidebarTab: SidebarTab;
  isMemberListOpen: boolean;

  // Modals
  activeModal: ModalType;
  modalPayload: ModalPayload;

  // Panels
  isPinnedMessagesOpen: boolean;
  isThreadOpen: boolean;
  activeThreadMessageId: string | null;

  // Command palette
  isCommandPaletteOpen: boolean;

  // Search
  isSearchOpen: boolean;
  searchQuery: string;

  // Notification badge
  totalUnreadCount: number;
  hasUnreadMentions: boolean;

  // Mobile
  isMobileDrawerOpen: boolean;

  // Actions — theme
  setTheme: (theme: Theme) => void;

  // Actions — sidebar
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setMemberListOpen: (open: boolean) => void;
  toggleMemberList: () => void;

  // Actions — modals
  openModal: (modal: ModalType, payload?: ModalPayload) => void;
  closeModal: () => void;

  // Actions — panels
  setPinnedMessagesOpen: (open: boolean) => void;
  openThread: (messageId: string) => void;
  closeThread: () => void;

  // Actions — command palette
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;

  // Actions — search
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  closeSearch: () => void;

  // Actions — notifications
  setTotalUnreadCount: (count: number) => void;
  setHasUnreadMentions: (has: boolean) => void;

  // Actions — mobile
  setMobileDrawerOpen: (open: boolean) => void;
  toggleMobileDrawer: () => void;

  // Reset
  reset: () => void;
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
  theme: "dark" as Theme,
  isSidebarOpen: true,
  sidebarTab: "channels" as SidebarTab,
  isMemberListOpen: true,
  activeModal: null as ModalType,
  modalPayload: {} as ModalPayload,
  isPinnedMessagesOpen: false,
  isThreadOpen: false,
  activeThreadMessageId: null,
  isCommandPaletteOpen: false,
  isSearchOpen: false,
  searchQuery: "",
  totalUnreadCount: 0,
  hasUnreadMentions: false,
  isMobileDrawerOpen: false,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ── Theme ──────────────────────────────────────────────────────────────

        setTheme: (theme) =>
          set({ theme }, false, "ui/setTheme"),

        // ── Sidebar ───────────────────────────────────────────────────────────

        setSidebarOpen: (open) =>
          set({ isSidebarOpen: open }, false, "ui/setSidebarOpen"),

        toggleSidebar: () =>
          set({ isSidebarOpen: !get().isSidebarOpen }, false, "ui/toggleSidebar"),

        setSidebarTab: (tab) =>
          set({ sidebarTab: tab }, false, "ui/setSidebarTab"),

        setMemberListOpen: (open) =>
          set({ isMemberListOpen: open }, false, "ui/setMemberListOpen"),

        toggleMemberList: () =>
          set(
            { isMemberListOpen: !get().isMemberListOpen },
            false,
            "ui/toggleMemberList"
          ),

        // ── Modals ────────────────────────────────────────────────────────────

        openModal: (modal, payload = {}) =>
          set(
            { activeModal: modal, modalPayload: payload },
            false,
            "ui/openModal"
          ),

        closeModal: () =>
          set(
            { activeModal: null, modalPayload: {} },
            false,
            "ui/closeModal"
          ),

        // ── Panels ────────────────────────────────────────────────────────────

        setPinnedMessagesOpen: (open) =>
          set({ isPinnedMessagesOpen: open }, false, "ui/setPinnedMessages"),

        openThread: (messageId) =>
          set(
            { isThreadOpen: true, activeThreadMessageId: messageId },
            false,
            "ui/openThread"
          ),

        closeThread: () =>
          set(
            { isThreadOpen: false, activeThreadMessageId: null },
            false,
            "ui/closeThread"
          ),

        // ── Command Palette ───────────────────────────────────────────────────

        setCommandPaletteOpen: (open) =>
          set({ isCommandPaletteOpen: open }, false, "ui/setCommandPalette"),

        toggleCommandPalette: () =>
          set(
            { isCommandPaletteOpen: !get().isCommandPaletteOpen },
            false,
            "ui/toggleCommandPalette"
          ),

        // ── Search ────────────────────────────────────────────────────────────

        setSearchOpen: (open) =>
          set({ isSearchOpen: open }, false, "ui/setSearchOpen"),

        setSearchQuery: (query) =>
          set({ searchQuery: query }, false, "ui/setSearchQuery"),

        closeSearch: () =>
          set(
            { isSearchOpen: false, searchQuery: "" },
            false,
            "ui/closeSearch"
          ),

        // ── Notifications ─────────────────────────────────────────────────────

        setTotalUnreadCount: (count) =>
          set({ totalUnreadCount: count }, false, "ui/setUnreadCount"),

        setHasUnreadMentions: (has) =>
          set({ hasUnreadMentions: has }, false, "ui/setUnreadMentions"),

        // ── Mobile ────────────────────────────────────────────────────────────

        setMobileDrawerOpen: (open) =>
          set({ isMobileDrawerOpen: open }, false, "ui/setMobileDrawer"),

        toggleMobileDrawer: () =>
          set(
            { isMobileDrawerOpen: !get().isMobileDrawerOpen },
            false,
            "ui/toggleMobileDrawer"
          ),

        // ── Reset ─────────────────────────────────────────────────────────────

        reset: () =>
          set(
            {
              ...initialState,
              // Preserve user preferences across reset
              theme: get().theme,
              isSidebarOpen: get().isSidebarOpen,
              isMemberListOpen: get().isMemberListOpen,
            },
            false,
            "ui/reset"
          ),
      }),
      {
        name: "obsidian:ui",
        // Only persist layout/theme preferences
        partialize: (state) => ({
          theme: state.theme,
          isSidebarOpen: state.isSidebarOpen,
          isMemberListOpen: state.isMemberListOpen,
          sidebarTab: state.sidebarTab,
        }),
      }
    ),
    { name: "UIStore" }
  )
);

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectIsModalOpen =
  (modal: ModalType) =>
  (state: UIState): boolean =>
    state.activeModal === modal;

export const selectAnyModalOpen = (state: UIState): boolean =>
  state.activeModal !== null;

export const selectIsDarkTheme = (state: UIState): boolean =>
  state.theme === "dark" ||
  (state.theme === "system" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches);
