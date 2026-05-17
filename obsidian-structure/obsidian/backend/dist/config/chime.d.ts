import { ChimeSDKMeetingsClient, CreateMeetingCommand, CreateAttendeeCommand, DeleteMeetingCommand, GetMeetingCommand, ListAttendeesCommand } from "@aws-sdk/client-chime-sdk-meetings";
export declare const chimeClient: ChimeSDKMeetingsClient;
export { CreateMeetingCommand, CreateAttendeeCommand, DeleteMeetingCommand, GetMeetingCommand, ListAttendeesCommand, };
export declare const CHIME_CONFIG: {
    mediaRegion: string;
    meetingIdPrefix: string;
    maxAttendeesPerMeeting: number;
    meetingFeatures: {
        audio: {
            EchoReduction: "AVAILABLE";
        };
    };
    qualityPresets: {
        standard: {
            echoReduction: boolean;
            noiseSuppression: boolean;
        };
        "high-fi": {
            echoReduction: boolean;
            noiseSuppression: boolean;
        };
        spatial: {
            echoReduction: boolean;
            noiseSuppression: boolean;
            spatialAudio: boolean;
        };
    };
    tags: {
        Key: string;
        Value: string;
    }[];
};
export declare const buildExternalMeetingId: (workspaceId: string, channelId: string) => string;
export declare const buildExternalUserId: (workspaceId: string, userId: string) => string;
export declare const parseExternalUserId: (externalUserId: string) => {
    workspaceId: string;
    userId: string;
};
//# sourceMappingURL=chime.d.ts.map