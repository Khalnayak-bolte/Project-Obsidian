'use strict';
// js/config/appConfig.js

const appConfig = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  apiVersion: 'v1',
  apiPrefix: '/api/v1',

  cors: {
    allowedOrigins: [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'https://obsidian.app',
      'https://www.obsidian.app',
    ],
    allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-workspace-id'],
  },

  rateLimit: {
    login:    { windowMs: 60 * 1000, max: 10 },
    messages: { windowMs: 60 * 1000, max: 60 },
    voiceJoin:{ windowMs: 60 * 1000, max: 20 },
    uploads:  { windowMs: 60 * 1000, max: 15 },
    default:  { windowMs: 60 * 1000, max: 100 },
  },

  subscription: {
    tiers: {
      gold: {
        maxMembers: 15,
        maxStorageBytes: 5 * 1024 * 1024 * 1024,
        maxFileSizeBytes: 25 * 1024 * 1024,
      },
      premium: {
        maxMembers: 50,
        maxStorageBytes: 25 * 1024 * 1024 * 1024,
        maxFileSizeBytes: 100 * 1024 * 1024,
      },
      deluxe: {
        maxMembers: 150,
        maxStorageBytes: 100 * 1024 * 1024 * 1024,
        maxFileSizeBytes: 500 * 1024 * 1024,
      },
    },
  },

  presence: {
    heartbeatIntervalMs: 30 * 1000,
    offlineThresholdMs: 90 * 1000,
  },

  voice: {
    idleTimeoutMs: 10 * 60 * 1000,
    mediaRegion: process.env.CHIME_MEDIA_REGION || 'ap-southeast-1',
  },

  pagination: {
    defaultLimit: 50,
    maxLimit: 100,
  },

  isProd: process.env.NODE_ENV === 'production',
  isDev:  process.env.NODE_ENV !== 'production',
};

module.exports = appConfig;
