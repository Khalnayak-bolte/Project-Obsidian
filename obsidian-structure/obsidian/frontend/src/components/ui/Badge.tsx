/**
 * frontend/src/components/ui/Badge.tsx
 * Project: Obsidian
 */

import { cn } from "../../utils/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BadgeVariant =
  | "default"
  | "accent"
  | "success"
  | "warning"
  | "error"
  | "muted"
  | "outline";

export type BadgeSize = "sm" | "md" | "lg";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
}

// ─── Variant styles ───────────────────────────────────────────────────────────

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default:  "bg-zinc-700/60 text-zinc-200 border border-zinc-600/40",
  accent:   "bg-[#6D5EF5]/20 text-[#a99cf7] border border-[#6D5EF5]/30",
  success:  "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  warning:  "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  error:    "bg-red-500/15 text-red-400 border border-red-500/25",
  muted:    "bg-zinc-800/80 text-zinc-500 border border-zinc-700/40",
  outline:  "bg-transparent text-zinc-300 border border-zinc-600",
};

const DOT_VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default:  "bg-zinc-400",
  accent:   "bg-[#6D5EF5]",
  success:  "bg-emerald-400",
  warning:  "bg-amber-400",
  error:    "bg-red-400",
  muted:    "bg-zinc-500",
  outline:  "bg-zinc-400",
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: "px-1.5 py-0.5 text-[10px] gap-1",
  md: "px-2 py-0.5 text-xs gap-1.5",
  lg: "px-2.5 py-1 text-sm gap-1.5",
};

const DOT_SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
  lg: "h-2.5 w-2.5",
};

// ─── Badge component ──────────────────────────────────────────────────────────

export function Badge({
  children,
  variant = "default",
  size = "md",
  dot = false,
  removable = false,
  onRemove,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium leading-none select-none whitespace-nowrap",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            "rounded-full shrink-0",
            DOT_VARIANT_CLASSES[variant],
            DOT_SIZE_CLASSES[size]
          )}
        />
      )}

      {children}

      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            "ml-0.5 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center",
            size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"
          )}
          aria-label="Remove"
        >
          <svg
            className={cn(size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5")}
            viewBox="0 0 8 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M1 1l6 6M7 1L1 7" />
          </svg>
        </button>
      )}
    </span>
  );
}

// ─── Count badge (notification bubbles) ──────────────────────────────────────

export interface CountBadgeProps {
  count: number;
  max?: number;
  variant?: BadgeVariant;
  className?: string;
}

export function CountBadge({
  count,
  max = 99,
  variant = "error",
  className,
}: CountBadgeProps) {
  if (count <= 0) return null;

  const label = count > max ? `${max}+` : String(count);
  const isSmall = label.length === 1;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full text-[10px] font-bold leading-none select-none",
        VARIANT_CLASSES[variant],
        isSmall ? "h-4 w-4" : "h-4 px-1.5",
        className
      )}
      aria-label={`${count} notifications`}
    >
      {label}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

export type StatusBadgeStatus = "online" | "away" | "busy" | "offline";

const STATUS_VARIANT: Record<StatusBadgeStatus, BadgeVariant> = {
  online:  "success",
  away:    "warning",
  busy:    "error",
  offline: "muted",
};

const STATUS_LABELS: Record<StatusBadgeStatus, string> = {
  online:  "Online",
  away:    "Away",
  busy:    "Busy",
  offline: "Offline",
};

export interface StatusBadgeProps {
  status: StatusBadgeStatus;
  showLabel?: boolean;
  size?: BadgeSize;
  className?: string;
}

export function StatusBadge({
  status,
  showLabel = true,
  size = "sm",
  className,
}: StatusBadgeProps) {
  return (
    <Badge
      variant={STATUS_VARIANT[status]}
      size={size}
      dot
      className={className}
    >
      {showLabel && STATUS_LABELS[status]}
    </Badge>
  );
}
