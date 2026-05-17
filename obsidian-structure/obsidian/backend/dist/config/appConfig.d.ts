declare const appConfig: {
    env: string;
    port: number;
    apiVersion: string;
    apiPrefix: string;
    aws: {
        region: string;
        accountId: string;
    };
    cors: {
        allowedOrigins: string[];
        allowedMethods: string[];
        allowedHeaders: string[];
    };
    rateLimit: {
        login: {
            windowMs: number;
            max: number;
        };
        messages: {
            windowMs: number;
            max: number;
        };
        voiceJoin: {
            windowMs: number;
            max: number;
        };
        uploads: {
            windowMs: number;
            max: number;
        };
        default: {
            windowMs: number;
            max: number;
        };
    };
    subscription: {
        tiers: {
            gold: {
                maxMembers: number;
                maxStorageBytes: number;
                maxFileSizeBytes: number;
                voiceQuality: string;
                guestAccess: boolean;
                customRoles: string;
            };
            premium: {
                maxMembers: number;
                maxStorageBytes: number;
                maxFileSizeBytes: number;
                voiceQuality: string;
                guestAccess: boolean;
                customRoles: string;
            };
            deluxe: {
                maxMembers: number;
                maxStorageBytes: number;
                maxFileSizeBytes: number;
                voiceQuality: string;
                guestAccess: boolean;
                customRoles: string;
            };
        };
    };
    presence: {
        heartbeatIntervalMs: number;
        offlineThresholdMs: number;
    };
    voice: {
        idleTimeoutMs: number;
        mediaRegion: string;
    };
    jwt: {
        expiresIn: string;
        refreshExpiresIn: string;
    };
    pagination: {
        defaultLimit: number;
        maxLimit: number;
    };
    isProd: boolean;
    isDev: boolean;
};
export type SubscriptionTier = keyof typeof appConfig.subscription.tiers;
export type TierConfig = typeof appConfig.subscription.tiers.gold;
export default appConfig;
//# sourceMappingURL=appConfig.d.ts.map