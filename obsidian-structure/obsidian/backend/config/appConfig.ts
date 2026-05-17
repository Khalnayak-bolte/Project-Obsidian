const appConfig = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "8080", 10),
  apiVersion: "v1",
  apiPrefix: "/api/v1",

  aws: {
    region: process.env.AWS_REGION || "ap-south-1",
    accountId: process.env.AWS_ACCOUNT_ID || "",
  },

  cors: {
    allowedOrigins: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "https://obsidian.app",
      "https://www.obsidian.app",
    ],
    allowedMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-workspace-id"],
  },

  rateLimit: {
    login: { windowMs: 60 * 1000, max: 10 },
    messages: { windowMs: 60 * 1000, max: 60 },
    voiceJoin: { windowMs: 60 * 1000, max: 20 },
    uploads: { windowMs: 60 * 1000, max: 15 },
    default: { windowMs: 60 * 1000, max: 100 },
  },

  subscription: {
    tiers: {
      gold: {
        maxMembers: 15,
        maxStorageBytes: 5 * 1024 * 1024 * 1024,       // 5 GB
        maxFileSizeBytes: 25 * 1024 * 1024,             // 25 MB
        voiceQuality: "standard",
        guestAccess: false,
        customRoles: "limited",
      },
      premium: {
        maxMembers: 50,
        maxStorageBytes: 25 * 1024 * 1024 * 1024,      // 25 GB
        maxFileSizeBytes: 100 * 1024 * 1024,            // 100 MB
        voiceQuality: "high-fi",
        guestAccess: false,
        customRoles: "full",
      },
      deluxe: {
        maxMembers: 150,
        maxStorageBytes: 100 * 1024 * 1024 * 1024,     // 100 GB
        maxFileSizeBytes: 500 * 1024 * 1024,            // 500 MB
        voiceQuality: "spatial",
        guestAccess: true,
        customRoles: "advanced",
      },
    },
  },

  presence: {
    heartbeatIntervalMs: 30 * 1000,   // 30 seconds
    offlineThresholdMs: 90 * 1000,    // 90 seconds
  },

  voice: {
    idleTimeoutMs: 10 * 60 * 1000,   // 10 minutes
    mediaRegion: process.env.CHIME_MEDIA_REGION || "ap-southeast-1",
  },

  jwt: {
    expiresIn: "1h",
    refreshExpiresIn: "7d",
  },

  pagination: {
    defaultLimit: 50,
    maxLimit: 100,
  },

  isProd: process.env.NODE_ENV === "production",
  isDev: process.env.NODE_ENV === "development",
};

export type SubscriptionTier = keyof typeof appConfig.subscription.tiers;
export type TierConfig = typeof appConfig.subscription.tiers.gold;

export default appConfig;
