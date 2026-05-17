import { Request } from "express";

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationMeta {
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
  total?: number;
}

export interface PaginationParams {
  limit?: number;
  cursor?: string;
}

// ─── Firestore Timestamps ─────────────────────────────────────────────────────

export interface FirestoreTimestamps {
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

// ─── Authenticated Request ────────────────────────────────────────────────────

export interface AuthenticatedUser {
  uid: string;
  email: string;
  workspaceId: string;
  roleId: string;
  permissions: Record<string, boolean>;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  workspaceId: string;
}

// ─── Error Codes ──────────────────────────────────────────────────────────────

export const ERROR_CODES = {
  // Auth
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  INVALID_TOKEN: "INVALID_TOKEN",

  // Resource
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  CONFLICT: "CONFLICT",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",

  // Subscription
  SUBSCRIPTION_REQUIRED: "SUBSCRIPTION_REQUIRED",
  TIER_LIMIT_EXCEEDED: "TIER_LIMIT_EXCEEDED",
  STORAGE_LIMIT_EXCEEDED: "STORAGE_LIMIT_EXCEEDED",
  MEMBER_LIMIT_EXCEEDED: "MEMBER_LIMIT_EXCEEDED",

  // Voice
  VOICE_SESSION_NOT_FOUND: "VOICE_SESSION_NOT_FOUND",
  VOICE_JOIN_FAILED: "VOICE_JOIN_FAILED",

  // File
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  INVALID_FILE_TYPE: "INVALID_FILE_TYPE",
  UPLOAD_FAILED: "UPLOAD_FAILED",

  // Payment
  PAYMENT_FAILED: "PAYMENT_FAILED",
  INVALID_WEBHOOK: "INVALID_WEBHOOK",
  WEBHOOK_REPLAY: "WEBHOOK_REPLAY",

  // Server
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  RATE_LIMITED: "RATE_LIMITED",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ─── HTTP Status Codes ────────────────────────────────────────────────────────

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

// ─── Utility Types ────────────────────────────────────────────────────────────

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Omit Firestore timestamps for create payloads
export type CreatePayload<T> = Omit<T, "createdAt" | "updatedAt" | "id">;
export type UpdatePayload<T> = Partial<Omit<T, "createdAt" | "updatedAt" | "id">>;
