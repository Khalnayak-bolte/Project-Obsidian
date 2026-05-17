/**
 * frontend/src/components/ui/Spinner.tsx
 * Project: Obsidian
 */

import { cn } from "../../utils/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";
export type SpinnerVariant = "default" | "accent" | "white" | "muted";

export interface SpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  label?: string;
  className?: string;
}

export interface SpinnerOverlayProps {
  label?: string;
  blur?: boolean;
  className?: string;
}

export interface LoadingStateProps {
  label?: string;
  size?: SpinnerSize;
  className?: string;
}

// ─── Size classes ─────────────────────────────────────────────────────────────

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  xs: "h-3 w-3 border",
  sm: "h-4 w-4 border",
  md: "h-5 w-5 border-2",
  lg: "h-7 w-7 border-2",
  xl: "h-10 w-10 border-[3px]",
};

const TEXT_SIZE_CLASSES: Record<SpinnerSize, string> = {
  xs: "text-[10px]",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

// ─── Variant classes ──────────────────────────────────────────────────────────

const VARIANT_CLASSES: Record<SpinnerVariant, string> = {
  default: "border-zinc-600 border-t-zinc-300",
  accent:  "border-[#6D5EF5]/30 border-t-[#6D5EF5]",
  white:   "border-white/20 border-t-white",
  muted:   "border-zinc-700 border-t-zinc-500",
};

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner({
  size = "md",
  variant = "accent",
  label,
  className,
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label ?? "Loading…"}
      className={cn("inline-flex items-center gap-2", className)}
    >
      <span
        className={cn(
          "rounded-full animate-spin shrink-0",
          SIZE_CLASSES[size],
          VARIANT_CLASSES[variant]
        )}
        aria-hidden="true"
      />

      {label && (
        <span
          className={cn("text-zinc-400 font-medium", TEXT_SIZE_CLASSES[size])}
        >
          {label}
        </span>
      )}
    </span>
  );
}

// ─── Dots spinner (alternative style) ────────────────────────────────────────

export interface DotsSpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  className?: string;
}

const DOTS_SIZE_CLASSES: Record<SpinnerSize, string> = {
  xs: "h-1 w-1",
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
  lg: "h-2.5 w-2.5",
  xl: "h-3 w-3",
};

const DOTS_VARIANT_CLASSES: Record<SpinnerVariant, string> = {
  default: "bg-zinc-300",
  accent:  "bg-[#6D5EF5]",
  white:   "bg-white",
  muted:   "bg-zinc-500",
};

const DOTS_GAP_CLASSES: Record<SpinnerSize, string> = {
  xs: "gap-0.5",
  sm: "gap-1",
  md: "gap-1.5",
  lg: "gap-2",
  xl: "gap-2.5",
};

export function DotsSpinner({
  size = "md",
  variant = "accent",
  className,
}: DotsSpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading…"
      className={cn("inline-flex items-center", DOTS_GAP_CLASSES[size], className)}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn(
            "rounded-full animate-bounce",
            DOTS_SIZE_CLASSES[size],
            DOTS_VARIANT_CLASSES[variant]
          )}
          style={{ animationDelay: `${i * 150}ms`, animationDuration: "600ms" }}
        />
      ))}
    </span>
  );
}

// ─── Pulse spinner (for voice / audio indicators) ────────────────────────────

export interface PulseSpinnerProps {
  size?: SpinnerSize;
  color?: string;
  className?: string;
}

const PULSE_SIZE_CLASSES: Record<SpinnerSize, string> = {
  xs: "h-4 w-4",
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-10 w-10",
};

export function PulseSpinner({
  size = "md",
  color = "bg-[#6D5EF5]",
  className,
}: PulseSpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Active"
      className={cn(
        "relative inline-flex items-center justify-center",
        PULSE_SIZE_CLASSES[size],
        className
      )}
    >
      {/* Outer pulse ring */}
      <span
        className={cn(
          "absolute inset-0 rounded-full opacity-30 animate-ping",
          color
        )}
        aria-hidden="true"
      />
      {/* Inner dot */}
      <span
        className={cn("rounded-full", color, {
          "h-2 w-2": size === "xs" || size === "sm",
          "h-2.5 w-2.5": size === "md",
          "h-3 w-3": size === "lg",
          "h-4 w-4": size === "xl",
        })}
        aria-hidden="true"
      />
    </span>
  );
}

// ─── Spinner overlay (full container) ────────────────────────────────────────

export function SpinnerOverlay({
  label,
  blur = true,
  className,
}: SpinnerOverlayProps) {
  return (
    <div
      role="status"
      aria-label={label ?? "Loading…"}
      className={cn(
        "absolute inset-0 z-20 flex flex-col items-center justify-center gap-3",
        "bg-[#0B0F19]/70",
        blur && "backdrop-blur-sm",
        className
      )}
    >
      <Spinner size="lg" variant="accent" />
      {label && (
        <p className="text-sm text-zinc-400 font-medium animate-pulse">
          {label}
        </p>
      )}
    </div>
  );
}

// ─── Full page loading state ──────────────────────────────────────────────────

export function LoadingState({
  label = "Loading…",
  size = "lg",
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-16",
        className
      )}
    >
      <Spinner size={size} variant="accent" />
      <p className={cn("text-zinc-500 font-medium", TEXT_SIZE_CLASSES[size])}>
        {label}
      </p>
    </div>
  );
}

// ─── Button-embedded spinner (used inside Button.tsx) ────────────────────────
// Re-exported here so Button.tsx can import from a single file if needed.
// Button already imports Spinner directly — this is just an alias for clarity.

export { Spinner as ButtonSpinner };
