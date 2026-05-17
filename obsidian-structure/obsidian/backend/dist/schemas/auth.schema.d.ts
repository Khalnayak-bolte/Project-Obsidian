/**
 * backend/schemas/auth.schema.ts
 * Project: Obsidian
 *
 * Zod validation schemas for all authentication-related request bodies.
 * Each schema is co-located with its inferred TypeScript type so controllers
 * and services can share a single source of truth.
 */
import { z } from "zod";
export declare const RegisterWithEmailSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    displayName: z.ZodString;
    workspaceName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    displayName: string;
    password: string;
    workspaceName?: string | undefined;
}, {
    email: string;
    displayName: string;
    password: string;
    workspaceName?: string | undefined;
}>;
export type RegisterWithEmailInput = z.infer<typeof RegisterWithEmailSchema>;
export declare const LoginWithEmailSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    deviceId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    deviceId?: string | undefined;
}, {
    email: string;
    password: string;
    deviceId?: string | undefined;
}>;
export type LoginWithEmailInput = z.infer<typeof LoginWithEmailSchema>;
export declare const OAuthLoginSchema: z.ZodObject<{
    idToken: z.ZodString;
    provider: z.ZodEnum<["google", "github"]>;
    deviceId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    provider: "google" | "github";
    idToken: string;
    deviceId?: string | undefined;
}, {
    provider: "google" | "github";
    idToken: string;
    deviceId?: string | undefined;
}>;
export type OAuthLoginInput = z.infer<typeof OAuthLoginSchema>;
export declare const RefreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodString;
    deviceId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
    deviceId?: string | undefined;
}, {
    refreshToken: string;
    deviceId?: string | undefined;
}>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export declare const RequestPasswordResetSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export type RequestPasswordResetInput = z.infer<typeof RequestPasswordResetSchema>;
export declare const ResetPasswordSchema: z.ZodEffects<z.ZodObject<{
    oobCode: z.ZodString;
    newPassword: z.ZodString;
    confirmPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    oobCode: string;
    newPassword: string;
    confirmPassword: string;
}, {
    oobCode: string;
    newPassword: string;
    confirmPassword: string;
}>, {
    oobCode: string;
    newPassword: string;
    confirmPassword: string;
}, {
    oobCode: string;
    newPassword: string;
    confirmPassword: string;
}>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export declare const VerifyTokenSchema: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export type VerifyTokenInput = z.infer<typeof VerifyTokenSchema>;
export declare const UpdateProfileSchema: z.ZodEffects<z.ZodObject<{
    displayName: z.ZodOptional<z.ZodString>;
    avatarUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodEnum<["online", "away", "busy", "offline"]>>;
}, "strip", z.ZodTypeAny, {
    displayName?: string | undefined;
    avatarUrl?: string | null | undefined;
    status?: "online" | "away" | "busy" | "offline" | undefined;
}, {
    displayName?: string | undefined;
    avatarUrl?: string | null | undefined;
    status?: "online" | "away" | "busy" | "offline" | undefined;
}>, {
    displayName?: string | undefined;
    avatarUrl?: string | null | undefined;
    status?: "online" | "away" | "busy" | "offline" | undefined;
}, {
    displayName?: string | undefined;
    avatarUrl?: string | null | undefined;
    status?: "online" | "away" | "busy" | "offline" | undefined;
}>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export declare const ChangePasswordSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
    confirmPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    newPassword: string;
    confirmPassword: string;
    currentPassword: string;
}, {
    newPassword: string;
    confirmPassword: string;
    currentPassword: string;
}>, {
    newPassword: string;
    confirmPassword: string;
    currentPassword: string;
}, {
    newPassword: string;
    confirmPassword: string;
    currentPassword: string;
}>, {
    newPassword: string;
    confirmPassword: string;
    currentPassword: string;
}, {
    newPassword: string;
    confirmPassword: string;
    currentPassword: string;
}>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export declare const LogoutSchema: z.ZodObject<{
    deviceId: z.ZodOptional<z.ZodString>;
    allDevices: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    allDevices: boolean;
    deviceId?: string | undefined;
}, {
    deviceId?: string | undefined;
    allDevices?: boolean | undefined;
}>;
export type LogoutInput = z.infer<typeof LogoutSchema>;
export declare const MagicLinkRequestSchema: z.ZodObject<{
    email: z.ZodString;
    redirectUrl: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    redirectUrl: string;
}, {
    email: string;
    redirectUrl: string;
}>;
export type MagicLinkRequestInput = z.infer<typeof MagicLinkRequestSchema>;
//# sourceMappingURL=auth.schema.d.ts.map