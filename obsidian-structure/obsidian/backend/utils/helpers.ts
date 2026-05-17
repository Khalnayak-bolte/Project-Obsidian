import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { ApiSuccess, ApiError, ErrorCode, HTTP_STATUS } from "../types/common";

// ─── ID Generation ────────────────────────────────────────────────────────────

export const generateId = (prefix?: string): string => {
  const id = uuidv4().replace(/-/g, "").slice(0, 16);
  return prefix ? `${prefix}_${id}` : id;
};

export const generateWorkspaceId = () => generateId("ws");
export const generateChannelId = () => generateId("chn");
export const generateMessageId = () => generateId("msg");
export const generateFileId = () => generateId("file");
export const generateInviteId = () => generateId("inv");
export const generateSessionId = () => generateId("sess");
export const generatePaymentId = () => generateId("pay");
export const generateInvoiceId = () => generateId("inv");
export const generateWebhookId = () => generateId("whk");
export const generateRoleId = () => generateId("role");

// ─── Slug Generation ──────────────────────────────────────────────────────────

export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")   // remove special chars
    .replace(/\s+/g, "-")            // spaces to hyphens
    .replace(/-+/g, "-")             // collapse multiple hyphens
    .slice(0, 48);                   // max length
};

export const generateUniqueSlug = (name: string, suffix?: string): string => {
  const base = generateSlug(name);
  const tag = suffix ?? crypto.randomBytes(3).toString("hex");
  return `${base}-${tag}`;
};

// ─── Token Generation ─────────────────────────────────────────────────────────

export const generateSecureToken = (bytes = 32): string => {
  return crypto.randomBytes(bytes).toString("hex");
};

export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const generateInviteToken = (): { raw: string; hashed: string } => {
  const raw = generateSecureToken(24);
  const hashed = hashToken(raw);
  return { raw, hashed };
};

// ─── API Response Builders ────────────────────────────────────────────────────

export const successResponse = <T>(
  data: T,
  message?: string,
  meta?: ApiSuccess<T>["meta"]
): ApiSuccess<T> => ({
  success: true,
  data,
  ...(message && { message }),
  ...(meta && { meta }),
});

export const errorResponse = (
  code: ErrorCode,
  message: string,
  details?: unknown
): ApiError => ({
  success: false,
  error: { code, message, details },
});

// ─── HTTP Status Mapper ───────────────────────────────────────────────────────

export const errorCodeToStatus = (code: ErrorCode): number => {
  const map: Partial<Record<ErrorCode, number>> = {
    UNAUTHORIZED: HTTP_STATUS.UNAUTHORIZED,
    FORBIDDEN: HTTP_STATUS.FORBIDDEN,
    TOKEN_EXPIRED: HTTP_STATUS.UNAUTHORIZED,
    INVALID_TOKEN: HTTP_STATUS.UNAUTHORIZED,
    NOT_FOUND: HTTP_STATUS.NOT_FOUND,
    ALREADY_EXISTS: HTTP_STATUS.CONFLICT,
    CONFLICT: HTTP_STATUS.CONFLICT,
    VALIDATION_ERROR: HTTP_STATUS.BAD_REQUEST,
    INVALID_INPUT: HTTP_STATUS.BAD_REQUEST,
    SUBSCRIPTION_REQUIRED: HTTP_STATUS.FORBIDDEN,
    TIER_LIMIT_EXCEEDED: HTTP_STATUS.FORBIDDEN,
    STORAGE_LIMIT_EXCEEDED: HTTP_STATUS.FORBIDDEN,
    MEMBER_LIMIT_EXCEEDED: HTTP_STATUS.FORBIDDEN,
    VOICE_SESSION_NOT_FOUND: HTTP_STATUS.NOT_FOUND,
    VOICE_JOIN_FAILED: HTTP_STATUS.INTERNAL_ERROR,
    FILE_TOO_LARGE: HTTP_STATUS.BAD_REQUEST,
    INVALID_FILE_TYPE: HTTP_STATUS.BAD_REQUEST,
    UPLOAD_FAILED: HTTP_STATUS.INTERNAL_ERROR,
    PAYMENT_FAILED: HTTP_STATUS.BAD_REQUEST,
    INVALID_WEBHOOK: HTTP_STATUS.BAD_REQUEST,
    WEBHOOK_REPLAY: HTTP_STATUS.BAD_REQUEST,
    INTERNAL_ERROR: HTTP_STATUS.INTERNAL_ERROR,
    SERVICE_UNAVAILABLE: HTTP_STATUS.SERVICE_UNAVAILABLE,
    RATE_LIMITED: HTTP_STATUS.TOO_MANY_REQUESTS,
  };
  return map[code] ?? HTTP_STATUS.INTERNAL_ERROR;
};

// ─── Pagination ───────────────────────────────────────────────────────────────

export const parsePaginationParams = (
  query: Record<string, unknown>,
  defaultLimit = 50,
  maxLimit = 100
): { limit: number; cursor?: string } => {
  const limit = Math.min(
    parseInt(String(query.limit ?? defaultLimit), 10),
    maxLimit
  );
  const cursor = query.cursor ? String(query.cursor) : undefined;
  return { limit, cursor };
};

// ─── String Utils ─────────────────────────────────────────────────────────────

export const truncate = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
};

export const sanitizeDisplayName = (name: string): string => {
  return name.trim().replace(/\s+/g, " ").slice(0, 64);
};

export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// ─── Bytes Formatter ──────────────────────────────────────────────────────────

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
};

// ─── Date Utils ───────────────────────────────────────────────────────────────

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export const isExpired = (expiresAt: Date): boolean => {
  return new Date() > expiresAt;
};

// ─── Object Utils ─────────────────────────────────────────────────────────────

export const omitUndefined = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
};

export const pick = <T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  return keys.reduce((acc, key) => {
    if (key in obj) acc[key] = obj[key];
    return acc;
  }, {} as Pick<T, K>);
};

export const omit = <T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result as Omit<T, K>;
};

// ─── Sleep ────────────────────────────────────────────────────────────────────

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ─── Safe JSON parse ─────────────────────────────────────────────────────────

export const safeJsonParse = <T>(str: string, fallback: T): T => {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
};
