/**
 * backend/schemas/auth.schema.ts
 * Project: Obsidian
 *
 * Zod validation schemas for all authentication-related request bodies.
 * Each schema is co-located with its inferred TypeScript type so controllers
 * and services can share a single source of truth.
 */
import { z } from "zod";
// ─── Shared field definitions ─────────────────────────────────────────────────
const emailField = z
    .string({ required_error: "Email is required." })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address.")
    .max(254, "Email must not exceed 254 characters.");
const passwordField = z
    .string({ required_error: "Password is required." })
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must not exceed 128 characters.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number.");
const displayNameField = z
    .string({ required_error: "Display name is required." })
    .trim()
    .min(2, "Display name must be at least 2 characters.")
    .max(64, "Display name must not exceed 64 characters.")
    .regex(/^[a-zA-Z0-9\s._'-]+$/, "Display name contains invalid characters.");
const deviceIdField = z
    .string()
    .trim()
    .uuid("deviceId must be a valid UUID.")
    .optional();
const workspaceNameField = z
    .string()
    .trim()
    .min(2, "Workspace name must be at least 2 characters.")
    .max(48, "Workspace name must not exceed 48 characters.")
    .regex(/^[a-zA-Z0-9\s._'-]+$/, "Workspace name contains invalid characters.")
    .optional();
// ─── Register with Email ──────────────────────────────────────────────────────
export const RegisterWithEmailSchema = z.object({
    email: emailField,
    password: passwordField,
    displayName: displayNameField,
    workspaceName: workspaceNameField,
});
// ─── Login with Email ─────────────────────────────────────────────────────────
export const LoginWithEmailSchema = z.object({
    email: emailField,
    password: z
        .string({ required_error: "Password is required." })
        .min(1, "Password must not be empty."),
    deviceId: deviceIdField,
});
// ─── OAuth Login (Google / GitHub) ───────────────────────────────────────────
// The frontend exchanges an OAuth credential for a Firebase ID token before
// calling the backend, so we only need to validate the resulting token.
export const OAuthLoginSchema = z.object({
    idToken: z
        .string({ required_error: "Firebase ID token is required." })
        .min(1, "Firebase ID token must not be empty."),
    provider: z.enum(["google", "github"], {
        errorMap: () => ({ message: "Provider must be 'google' or 'github'." }),
    }),
    deviceId: deviceIdField,
});
// ─── Refresh Token ────────────────────────────────────────────────────────────
export const RefreshTokenSchema = z.object({
    refreshToken: z
        .string({ required_error: "Refresh token is required." })
        .min(1, "Refresh token must not be empty."),
    deviceId: deviceIdField,
});
// ─── Request Password Reset ───────────────────────────────────────────────────
export const RequestPasswordResetSchema = z.object({
    email: emailField,
});
// ─── Reset Password ───────────────────────────────────────────────────────────
export const ResetPasswordSchema = z
    .object({
    oobCode: z
        .string({ required_error: "Reset code is required." })
        .min(1, "Reset code must not be empty."),
    newPassword: passwordField,
    confirmPassword: z
        .string({ required_error: "Please confirm your password." })
        .min(1, "Confirm password must not be empty."),
})
    .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
});
// ─── Verify Token (internal / admin use) ─────────────────────────────────────
export const VerifyTokenSchema = z.object({
    token: z
        .string({ required_error: "Token is required." })
        .min(1, "Token must not be empty."),
});
// ─── Update Profile ───────────────────────────────────────────────────────────
export const UpdateProfileSchema = z
    .object({
    displayName: displayNameField.optional(),
    avatarUrl: z
        .string()
        .trim()
        .url("Avatar URL must be a valid URL.")
        .max(512, "Avatar URL must not exceed 512 characters.")
        .optional()
        .nullable(),
    status: z
        .enum(["online", "away", "busy", "offline"], {
        errorMap: () => ({
            message: "Status must be one of: online, away, busy, offline.",
        }),
    })
        .optional(),
})
    .refine((data) => data.displayName !== undefined ||
    data.avatarUrl !== undefined ||
    data.status !== undefined, { message: "At least one field must be provided to update." });
// ─── Change Password (authenticated user) ────────────────────────────────────
export const ChangePasswordSchema = z
    .object({
    currentPassword: z
        .string({ required_error: "Current password is required." })
        .min(1, "Current password must not be empty."),
    newPassword: passwordField,
    confirmPassword: z
        .string({ required_error: "Please confirm your new password." })
        .min(1, "Confirm password must not be empty."),
})
    .refine((data) => data.newPassword !== data.currentPassword, {
    path: ["newPassword"],
    message: "New password must differ from your current password.",
})
    .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
});
// ─── Logout / Revoke Session ──────────────────────────────────────────────────
export const LogoutSchema = z.object({
    deviceId: deviceIdField,
    allDevices: z.boolean().optional().default(false),
});
// ─── Magic Link (future) ──────────────────────────────────────────────────────
export const MagicLinkRequestSchema = z.object({
    email: emailField,
    redirectUrl: z
        .string({ required_error: "Redirect URL is required." })
        .url("Redirect URL must be a valid URL.")
        .max(512, "Redirect URL must not exceed 512 characters."),
});
//# sourceMappingURL=auth.schema.js.map