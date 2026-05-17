import {
  MeetingSessionConfiguration,
  DefaultMeetingSession,
  ConsoleLogger,
  LogLevel,
  DefaultDeviceController,
  DefaultAudioVideoController,
  type MeetingSession,
  type AudioVideoObserver,
  VoiceFocusDeviceTransformer,
  type VoiceFocusTransformDevice,
  DefaultActiveSpeakerPolicy,
} from "amazon-chime-sdk-js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChimeMeetingInfo {
  meetingId: string;
  externalMeetingId: string;
  mediaRegion: string;
  mediaPlacement: {
    AudioHostUrl: string;
    AudioFallbackUrl: string;
    ScreenDataUrl: string;
    ScreenSharingUrl: string;
    ScreenViewingUrl: string;
    SignalingUrl: string;
    TurnControlUrl: string;
    EventIngestionUrl: string;
  };
}

export interface ChimeAttendeeInfo {
  attendeeId: string;
  externalUserId: string;
  joinToken: string;
}

export interface ChimeSessionOptions {
  meeting: ChimeMeetingInfo;
  attendee: ChimeAttendeeInfo;
  enableNoiseSuppression?: boolean;
}

// ─── Logger ───────────────────────────────────────────────────────────────────

const LOG_LEVEL = import.meta.env.DEV ? LogLevel.WARN : LogLevel.ERROR;

// ─── Session Factory ──────────────────────────────────────────────────────────

export const createMeetingSession = async (
  options: ChimeSessionOptions
): Promise<MeetingSession> => {
  try {
    const logger = new ConsoleLogger("ObsidianChime", LOG_LEVEL);

    const configuration = new MeetingSessionConfiguration(
      {
        MeetingId: options.meeting.meetingId,
        ExternalMeetingId: options.meeting.externalMeetingId,
        MediaRegion: options.meeting.mediaRegion,
        MediaPlacement: options.meeting.mediaPlacement,
      },
      {
        AttendeeId: options.attendee.attendeeId,
        ExternalUserId: options.attendee.externalUserId,
        JoinToken: options.attendee.joinToken,
      }
    );

    const deviceController = new DefaultDeviceController(logger, {
      enableWebAudio: true,
    });

    const session = new DefaultMeetingSession(configuration, logger, deviceController);

    return session;
  } catch (error) {
    console.error("[Chime] Failed to create meeting session:", error);
    throw error;
  }
};

// ─── Noise Suppression (Voice Focus) ─────────────────────────────────────────

export const createVoiceFocusDevice = async (
  inputDevice: string | MediaStream
): Promise<VoiceFocusTransformDevice | string | MediaStream> => {
  try {
    const isSupported = await VoiceFocusDeviceTransformer.isSupported();
    if (!isSupported) {
      console.warn("[Chime] Voice Focus not supported in this browser");
      return inputDevice;
    }

    const transformer = await VoiceFocusDeviceTransformer.create();
    const device = await transformer.createTransformDevice(inputDevice as string);
    return device ?? inputDevice;
  } catch (error) {
    console.error("[Chime] Voice Focus device creation failed:", error);
    return inputDevice;
  }
};

// ─── Device Enumeration ───────────────────────────────────────────────────────

export const getAudioInputDevices = async (
  session: MeetingSession
): Promise<MediaDeviceInfo[]> => {
  try {
    return await session.audioVideo.listAudioInputDevices();
  } catch (error) {
    console.error("[Chime] Failed to list audio input devices:", error);
    return [];
  }
};

export const getAudioOutputDevices = async (
  session: MeetingSession
): Promise<MediaDeviceInfo[]> => {
  try {
    return await session.audioVideo.listAudioOutputDevices();
  } catch (error) {
    console.error("[Chime] Failed to list audio output devices:", error);
    return [];
  }
};

export const getVideoInputDevices = async (
  session: MeetingSession
): Promise<MediaDeviceInfo[]> => {
  try {
    return await session.audioVideo.listVideoInputDevices();
  } catch (error) {
    console.error("[Chime] Failed to list video input devices:", error);
    return [];
  }
};

// ─── Active Speaker Detection ─────────────────────────────────────────────────

export const subscribeToActiveSpeakers = (
  session: MeetingSession,
  onActiveSpeakers: (attendeeIds: string[]) => void
): (() => void) => {
  const policy = new DefaultActiveSpeakerPolicy();

  session.audioVideo.subscribeToActiveSpeakerDetector(
    policy,
    (attendeeIds: string[]) => {
      onActiveSpeakers(attendeeIds);
    }
  );

  return () => {
    session.audioVideo.unsubscribeFromActiveSpeakerDetector(onActiveSpeakers);
  };
};

// ─── Connection Quality Observer ──────────────────────────────────────────────

export type ConnectionQuality = "good" | "fair" | "poor";

export const createConnectionObserver = (
  onQualityChange: (quality: ConnectionQuality) => void
): AudioVideoObserver => {
  return {
    connectionDidBecomePoor: () => onQualityChange("poor"),
    connectionDidSuggestStopVideo: () => onQualityChange("fair"),
    connectionDidBecomeGood: () => onQualityChange("good"),
  };
};

// ─── Graceful Cleanup ─────────────────────────────────────────────────────────

export const destroyMeetingSession = async (
  session: MeetingSession
): Promise<void> => {
  try {
    session.audioVideo.stop();
    await session.audioVideo.stopAudioInput();
    await session.audioVideo.stopVideoInput();
  } catch (error) {
    console.error("[Chime] Error during session cleanup:", error);
  }
};

// ─── Re-exports for convenience ───────────────────────────────────────────────

export type { MeetingSession, AudioVideoObserver, DefaultAudioVideoController };
