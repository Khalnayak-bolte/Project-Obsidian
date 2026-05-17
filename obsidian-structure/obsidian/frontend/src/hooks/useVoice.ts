/**
 * frontend/src/hooks/useVoice.ts
 * Project: Obsidian
 *
 * Manages the full voice channel lifecycle:
 * join → connect Chime → observe participants/speakers/quality → leave/cleanup.
 * Reads/writes voiceStore. API calls go through apiClient.
 */

import { useCallback, useEffect, useRef } from "react";
import { useVoiceStore } from "../stores/voiceStore";
import { apiClient } from "../lib/axios";
import {
  createMeetingSession,
  createVoiceFocusDevice,
  getAudioInputDevices,
  getAudioOutputDevices,
  subscribeToActiveSpeakers,
  createConnectionObserver,
  destroyMeetingSession,
  type ChimeMeetingInfo,
  type ChimeAttendeeInfo,
} from "../lib/chime";
import type { MeetingSession, AudioVideoObserver } from "../lib/chime";

// ─── API response shape ───────────────────────────────────────────────────────

interface JoinVoiceResponse {
  sessionId: string;
  meetingId: string;
  attendeeId: string;
  joinToken: string;
  mediaRegion: string;
  mediaPlacement: ChimeMeetingInfo["mediaPlacement"];
  participants: Array<{
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
  }>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoice() {
  const {
    connectionStatus,
    sessionInfo,
    meetingSession,
    isMuted,
    isDeafened,
    isScreenSharing,
    isNoiseSuppressed,
    participants,
    activeSpeakerIds,
    connectionQuality,
    audioPacketLoss,
    audioLatencyMs,
    audioInputDevices,
    audioOutputDevices,
    selectedAudioInputId,
    selectedAudioOutputId,
    error,
    setConnectionStatus,
    setSessionInfo,
    setMeetingSession,
    setIsMuted,
    setIsDeafened,
    setIsScreenSharing,
    setIsNoiseSuppressed,
    setParticipants,
    updateParticipant,
    addParticipant,
    removeParticipant,
    setActiveSpeakerIds,
    setAudioInputDevices,
    setAudioOutputDevices,
    setSelectedAudioInputId,
    setConnectionQuality,
    setAudioPacketLoss,
    setAudioLatencyMs,
    setError,
    reset,
  } = useVoiceStore();

  // Keep a stable ref to the session for cleanup
  const sessionRef = useRef<MeetingSession | null>(null);
  const observerRef = useRef<AudioVideoObserver | null>(null);
  const unsubscribeActiveSpeakersRef = useRef<(() => void) | null>(null);

  // ─── Join channel ───────────────────────────────────────────────────────────

  const joinChannel = useCallback(
    async (workspaceId: string, channelId: string) => {
      if (connectionStatus === "connecting" || connectionStatus === "connected") return;

      setConnectionStatus("connecting");
      setError(null);

      try {
        // 1. Request join credentials from backend
        const { data } = await apiClient.post<JoinVoiceResponse>(
          "/api/v1/voice/join",
          { workspaceId, channelId }
        );

        const meeting: ChimeMeetingInfo = {
          meetingId: data.meetingId,
          externalMeetingId: `obsidian-${workspaceId}-${channelId}`,
          mediaRegion: data.mediaRegion,
          mediaPlacement: data.mediaPlacement,
        };

        const attendee: ChimeAttendeeInfo = {
          attendeeId: data.attendeeId,
          externalUserId: `${workspaceId}#${data.attendeeId}`,
          joinToken: data.joinToken,
        };

        // 2. Create Chime meeting session
        const session = await createMeetingSession({
          meeting,
          attendee,
          enableNoiseSuppression: isNoiseSuppressed,
        });

        sessionRef.current = session;

        // 3. Enumerate audio devices
        const [inputs, outputs] = await Promise.all([
          getAudioInputDevices(session),
          getAudioOutputDevices(session),
        ]);
        setAudioInputDevices(inputs);
        setAudioOutputDevices(outputs);

        // 4. Select default or previously selected input device
        const inputDeviceId = selectedAudioInputId ?? inputs[0]?.deviceId ?? "default";
        const inputDevice = isNoiseSuppressed
          ? await createVoiceFocusDevice(inputDeviceId)
          : inputDeviceId;

        await session.audioVideo.startAudioInput(inputDevice as string);

        // 5. Attach audio output element
        const audioEl = document.getElementById("obsidian-voice-output") as HTMLAudioElement;
        if (audioEl) {
          await session.audioVideo.bindAudioElement(audioEl);
        }

        // 6. Register audio/video observers
        const connectionObserver = createConnectionObserver((quality) => {
          setConnectionQuality(quality);
        });

        const avObserver: AudioVideoObserver = {
          ...connectionObserver,
          audioVideoDidStart: () => {
            setConnectionStatus("connected");
          },
          audioVideoDidStop: () => {
            if (connectionStatus !== "disconnecting") {
              setConnectionStatus("reconnecting");
              // Auto-reconnect handled by Chime internally
            }
          },
          audioVideoDidStartConnecting: (reconnecting) => {
            if (reconnecting) setConnectionStatus("reconnecting");
          },
          attendeePresenceDidChange: (attendeeId, present, externalUserId) => {
            if (!present && externalUserId) {
              const uid = externalUserId.split("#")[1];
              if (uid) removeParticipant(uid);
            }
          },
        };

        observerRef.current = avObserver;
        session.audioVideo.addObserver(avObserver);

        // 7. Subscribe to active speaker detection
        const unsubscribe = subscribeToActiveSpeakers(session, (attendeeIds) => {
          const uids = attendeeIds.map((id) => {
            const participant = participants.find((p) => p.chimeAttendeeId === id);
            return participant?.uid ?? id;
          });
          setActiveSpeakerIds(uids);
        });
        unsubscribeActiveSpeakersRef.current = unsubscribe;

        // 8. Start the session
        session.audioVideo.start();
        setMeetingSession(session);

        // 9. Populate initial participants from API response
        setParticipants(data.participants);

        // 10. Update session info
        setSessionInfo({
          sessionId: data.sessionId,
          channelId,
          workspaceId,
          meetingId: data.meetingId,
          attendeeId: data.attendeeId,
          mediaRegion: data.mediaRegion,
        });
      } catch (err) {
        console.error("[useVoice] joinChannel failed:", err);
        setError("Failed to join voice channel. Please try again.");
        setConnectionStatus("failed");
        reset();
      }
    },
    [connectionStatus, isNoiseSuppressed, selectedAudioInputId, participants]
  );

  // ─── Leave channel ──────────────────────────────────────────────────────────

  const leaveChannel = useCallback(async () => {
    if (!sessionInfo || !sessionRef.current) return;

    setConnectionStatus("disconnecting");

    try {
      // 1. Notify backend
      await apiClient.post("/api/v1/voice/leave", {
        workspaceId: sessionInfo.workspaceId,
        channelId: sessionInfo.channelId,
        sessionId: sessionInfo.sessionId,
      });
    } catch (err) {
      console.error("[useVoice] leaveChannel API call failed:", err);
      // Continue cleanup regardless
    }

    // 2. Cleanup Chime session
    if (observerRef.current) {
      sessionRef.current.audioVideo.removeObserver(observerRef.current);
      observerRef.current = null;
    }
    if (unsubscribeActiveSpeakersRef.current) {
      unsubscribeActiveSpeakersRef.current();
      unsubscribeActiveSpeakersRef.current = null;
    }

    await destroyMeetingSession(sessionRef.current);
    sessionRef.current = null;

    reset();
  }, [sessionInfo]);

  // ─── Toggle mute ────────────────────────────────────────────────────────────

  const toggleMute = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;

    try {
      if (isMuted) {
        await session.audioVideo.startAudioInput(
          selectedAudioInputId ?? "default"
        );
        session.audioVideo.realtimeUnmuteLocalAudio();
      } else {
        session.audioVideo.realtimeMuteLocalAudio();
      }
      setIsMuted(!isMuted);

      // Notify backend
      if (sessionInfo) {
        await apiClient.post("/api/v1/voice/mute", {
          workspaceId: sessionInfo.workspaceId,
          channelId: sessionInfo.channelId,
          isMuted: !isMuted,
        });
      }
    } catch (err) {
      console.error("[useVoice] toggleMute failed:", err);
    }
  }, [isMuted, selectedAudioInputId, sessionInfo]);

  // ─── Toggle deafen ──────────────────────────────────────────────────────────

  const toggleDeafen = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;

    const newDeafened = !isDeafened;

    try {
      if (newDeafened) {
        // Mute audio output volume to 0
        session.audioVideo.setStreamMuteStateForAttendee("", newDeafened);
      }
      setIsDeafened(newDeafened);
    } catch (err) {
      console.error("[useVoice] toggleDeafen failed:", err);
    }
  }, [isDeafened]);

  // ─── Toggle noise suppression ───────────────────────────────────────────────

  const toggleNoiseSuppression = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;

    const newValue = !isNoiseSuppressed;

    try {
      const inputDeviceId = selectedAudioInputId ?? "default";
      const device = newValue
        ? await createVoiceFocusDevice(inputDeviceId)
        : inputDeviceId;

      await session.audioVideo.startAudioInput(device as string);
      setIsNoiseSuppressed(newValue);
    } catch (err) {
      console.error("[useVoice] toggleNoiseSuppression failed:", err);
    }
  }, [isNoiseSuppressed, selectedAudioInputId]);

  // ─── Switch audio input device ──────────────────────────────────────────────

  const switchAudioInput = useCallback(
    async (deviceId: string) => {
      const session = sessionRef.current;
      if (!session) return;

      try {
        const device = isNoiseSuppressed
          ? await createVoiceFocusDevice(deviceId)
          : deviceId;
        await session.audioVideo.startAudioInput(device as string);
        setSelectedAudioInputId(deviceId);
      } catch (err) {
        console.error("[useVoice] switchAudioInput failed:", err);
      }
    },
    [isNoiseSuppressed]
  );

  // ─── Cleanup on unmount ─────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        destroyMeetingSession(sessionRef.current).catch(() => {});
      }
    };
  }, []);

  // ─── Derived state ──────────────────────────────────────────────────────────

  const isConnected = connectionStatus === "connected";
  const isConnecting = connectionStatus === "connecting" || connectionStatus === "reconnecting";
  const isInChannel = connectionStatus !== "idle" && connectionStatus !== "failed";

  return {
    // State
    connectionStatus,
    sessionInfo,
    isMuted,
    isDeafened,
    isScreenSharing,
    isNoiseSuppressed,
    participants,
    activeSpeakerIds,
    connectionQuality,
    audioPacketLoss,
    audioLatencyMs,
    audioInputDevices,
    audioOutputDevices,
    selectedAudioInputId,
    error,

    // Derived
    isConnected,
    isConnecting,
    isInChannel,

    // Actions
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleDeafen,
    toggleNoiseSuppression,
    switchAudioInput,
  };
}
