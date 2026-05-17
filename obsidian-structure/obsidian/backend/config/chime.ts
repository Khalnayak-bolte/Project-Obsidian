import {
  ChimeSDKMeetingsClient,
  CreateMeetingCommand,
  CreateAttendeeCommand,
  DeleteMeetingCommand,
  GetMeetingCommand,
  ListAttendeesCommand,
} from "@aws-sdk/client-chime-sdk-meetings";
import appConfig from "./appConfig";

const baseConfig = {
  region: process.env.CHIME_REGION || "us-east-1", // Chime SDK Meetings only available in us-east-1
  ...(appConfig.isDev && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  }),
};

// Chime SDK Meetings client
export const chimeClient = new ChimeSDKMeetingsClient(baseConfig);

// Re-export commands for use in voiceService
export {
  CreateMeetingCommand,
  CreateAttendeeCommand,
  DeleteMeetingCommand,
  GetMeetingCommand,
  ListAttendeesCommand,
};

// Chime meeting config constants
export const CHIME_CONFIG = {
  // Media placement region closest to India
  mediaRegion: process.env.CHIME_MEDIA_REGION || "ap-southeast-1",

  // External meeting ID prefix for namespacing
  meetingIdPrefix: "obsidian",

  // Max attendees per meeting (Chime limit)
  maxAttendeesPerMeeting: 250,

  // Meeting features
  meetingFeatures: {
    audio: {
      EchoReduction: "AVAILABLE" as const,
    },
  },

  // Voice quality presets mapped to subscription tiers
  qualityPresets: {
    standard: {
      echoReduction: false,
      noiseSuppression: false,
    },
    "high-fi": {
      echoReduction: true,
      noiseSuppression: true,
    },
    spatial: {
      echoReduction: true,
      noiseSuppression: true,
      spatialAudio: true,
    },
  },

  // Tags applied to all Chime meetings for cost tracking
  tags: [
    { Key: "Project", Value: "Obsidian" },
    { Key: "Environment", Value: appConfig.env },
  ],
};

// Helper — build a consistent external meeting ID from workspace + channel
export const buildExternalMeetingId = (
  workspaceId: string,
  channelId: string
): string => {
  return `${CHIME_CONFIG.meetingIdPrefix}-${workspaceId}-${channelId}`;
};

// Helper — build a consistent external user ID for attendee
export const buildExternalUserId = (
  workspaceId: string,
  userId: string
): string => {
  return `${workspaceId}#${userId}`;
};

// Helper — parse userId back from external user ID
export const parseExternalUserId = (
  externalUserId: string
): { workspaceId: string; userId: string } => {
  const [workspaceId, userId] = externalUserId.split("#");
  return { workspaceId, userId };
};
