import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { MeetingSession } from "amazon-chime-sdk-js";
import type { ConnectionQuality } from "../lib/chime";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VoiceConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnecting"
  | "failed";

export interface VoiceParticipant {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  roleId: string;
  chimeAttendeeId: string;
  externalUserId: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
  joinedAt: string;
}

export interface VoiceSessionInfo {
  sessionId: string;
  channelId: string;
  workspaceId: string;
  meetingId: string;
  attendeeId: string;
  mediaRegion: string;
}

// ─── State Interface ──────────────────────────────────────────────────────────

interface VoiceState {
  // Connection
  connectionStatus: VoiceConnectionStatus;
  sessionInfo: VoiceSessionInfo | null;
  meetingSession: MeetingSession | null;

  // Local user state
  isMuted: boolean;
  isDeafened: boolean;
  isScreenSharing: boolean;
  isNoiseSuppressed: boolean;

  // Participants
  participants: VoiceParticipant[];
  activeSpeakerIds: string[];

  // Devices
  selectedAudioInputId: string | null;
  selectedAudioOutputId: string | null;
  audioInputDevices: MediaDeviceInfo[];
  audioOutputDevices: MediaDeviceInfo[];

  // Quality
  connectionQuality: ConnectionQuality;
  audioPacketLoss: number;
  audioLatencyMs: number;

  // Error
  error: string | null;

  // Actions — connection
  setConnectionStatus: (status: VoiceConnectionStatus) => void;
  setSessionInfo: (info: VoiceSessionInfo | null) => void;
  setMeetingSession: (session: MeetingSession | null) => void;

  // Actions — local state
  setIsMuted: (muted: boolean) => void;
  setIsDeafened: (deafened: boolean) => void;
  setIsScreenSharing: (sharing: boolean) => void;
  setIsNoiseSuppressed: (suppressed: boolean) => void;
  toggleMute: () => void;
  toggleDeafen: () => void;

  // Actions — participants
  setParticipants: (participants: VoiceParticipant[]) => void;
  upsertParticipant: (participant: VoiceParticipant) => void;
  removeParticipant: (chimeAttendeeId: string) => void;
  updateParticipantSpeaking: (chimeAttendeeId: string, isSpeaking: boolean) => void;
  setActiveSpeakerIds: (ids: string[]) => void;

  // Actions — devices
  setSelectedAudioInputId: (id: string | null) => void;
  setSelectedAudioOutputId: (id: string | null) => void;
  setAudioInputDevices: (devices: MediaDeviceInfo[]) => void;
  setAudioOutputDevices: (devices: MediaDeviceInfo[]) => void;

  // Actions — quality
  setConnectionQuality: (quality: ConnectionQuality) => void;
  setAudioStats: (packetLoss: number, latencyMs: number) => void;

  // Actions — error
  setError: (error: string | null) => void;

  // Reset
  reset: () => void;
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
  connectionStatus: "idle" as VoiceConnectionStatus,
  sessionInfo: null,
  meetingSession: null,
  isMuted: false,
  isDeafened: false,
  isScreenSharing: false,
  isNoiseSuppressed: true,
  participants: [],
  activeSpeakerIds: [],
  selectedAudioInputId: null,
  selectedAudioOutputId: null,
  audioInputDevices: [],
  audioOutputDevices: [],
  connectionQuality: "good" as ConnectionQuality,
  audioPacketLoss: 0,
  audioLatencyMs: 0,
  error: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useVoiceStore = create<VoiceState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ── Connection ──────────────────────────────────────────────────────────

      setConnectionStatus: (status) =>
        set({ connectionStatus: status }, false, "voice/setConnectionStatus"),

      setSessionInfo: (info) =>
        set({ sessionInfo: info }, false, "voice/setSessionInfo"),

      setMeetingSession: (session) =>
        set({ meetingSession: session }, false, "voice/setMeetingSession"),

      // ── Local State ─────────────────────────────────────────────────────────

      setIsMuted: (muted) =>
        set({ isMuted: muted }, false, "voice/setMuted"),

      setIsDeafened: (deafened) =>
        set({ isDeafened: deafened }, false, "voice/setDeafened"),

      setIsScreenSharing: (sharing) =>
        set({ isScreenSharing: sharing }, false, "voice/setScreenSharing"),

      setIsNoiseSuppressed: (suppressed) =>
        set({ isNoiseSuppressed: suppressed }, false, "voice/setNoiseSuppressed"),

      toggleMute: () =>
        set({ isMuted: !get().isMuted }, false, "voice/toggleMute"),

      toggleDeafen: () =>
        set({ isDeafened: !get().isDeafened }, false, "voice/toggleDeafen"),

      // ── Participants ────────────────────────────────────────────────────────

      setParticipants: (participants) =>
        set({ participants }, false, "voice/setParticipants"),

      upsertParticipant: (participant) => {
        const existing = get().participants;
        const idx = existing.findIndex(
          (p) => p.chimeAttendeeId === participant.chimeAttendeeId
        );
        const updated =
          idx >= 0
            ? existing.map((p) =>
                p.chimeAttendeeId === participant.chimeAttendeeId ? participant : p
              )
            : [...existing, participant];
        set({ participants: updated }, false, "voice/upsertParticipant");
      },

      removeParticipant: (chimeAttendeeId) =>
        set(
          {
            participants: get().participants.filter(
              (p) => p.chimeAttendeeId !== chimeAttendeeId
            ),
          },
          false,
          "voice/removeParticipant"
        ),

      updateParticipantSpeaking: (chimeAttendeeId, isSpeaking) => {
        const participants = get().participants.map((p) =>
          p.chimeAttendeeId === chimeAttendeeId ? { ...p, isSpeaking } : p
        );
        set({ participants }, false, "voice/updateSpeaking");
      },

      setActiveSpeakerIds: (ids) =>
        set({ activeSpeakerIds: ids }, false, "voice/setActiveSpeakers"),

      // ── Devices ─────────────────────────────────────────────────────────────

      setSelectedAudioInputId: (id) =>
        set({ selectedAudioInputId: id }, false, "voice/setAudioInput"),

      setSelectedAudioOutputId: (id) =>
        set({ selectedAudioOutputId: id }, false, "voice/setAudioOutput"),

      setAudioInputDevices: (devices) =>
        set({ audioInputDevices: devices }, false, "voice/setInputDevices"),

      setAudioOutputDevices: (devices) =>
        set({ audioOutputDevices: devices }, false, "voice/setOutputDevices"),

      // ── Quality ─────────────────────────────────────────────────────────────

      setConnectionQuality: (quality) =>
        set({ connectionQuality: quality }, false, "voice/setQuality"),

      setAudioStats: (audioPacketLoss, audioLatencyMs) =>
        set({ audioPacketLoss, audioLatencyMs }, false, "voice/setAudioStats"),

      // ── Error ────────────────────────────────────────────────────────────────

      setError: (error) =>
        set({ error }, false, "voice/setError"),

      // ── Reset ────────────────────────────────────────────────────────────────

      reset: () => set(initialState, false, "voice/reset"),
    }),
    { name: "VoiceStore" }
  )
);

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectIsInVoice = (state: VoiceState): boolean =>
  state.connectionStatus === "connected";

export const selectIsConnecting = (state: VoiceState): boolean =>
  state.connectionStatus === "connecting" ||
  state.connectionStatus === "reconnecting";

export const selectParticipantCount = (state: VoiceState): number =>
  state.participants.length;

export const selectActiveSpeakers = (state: VoiceState): VoiceParticipant[] =>
  state.participants.filter((p) =>
    state.activeSpeakerIds.includes(p.chimeAttendeeId)
  );

export const selectCurrentChannelId = (state: VoiceState): string | null =>
  state.sessionInfo?.channelId ?? null;

export const selectIsQualityPoor = (state: VoiceState): boolean =>
  state.connectionQuality === "poor";
