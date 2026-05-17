/**
 * frontend/src/components/ui/Avatar.tsx
 * Project: Obsidian
 */

import { useState } from "react";
import { cn } from "../../utils/cn";
import type { PresenceStatus } from "../../types/workspace";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface AvatarProps {
  src?: string;
  displayName: string;
  size?: AvatarSize;
  status?: PresenceStatus;
  showStatus?: boolean;
  className?: string;
  onClick?: () => void;
}

// ─── Size config ──────────────────────────────────────────────────────────────

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-xl",
};

const STATUS_SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: "h-1.5 w-1.5 ring-1",
  sm: "h-2 w-2 ring-1",
  md: "h-2.5 w-2.5 ring-[1.5px]",
  lg: "h-3 w-3 ring-2",
  xl: "h-4 w-4 ring-2",
};

const STATUS_COLORS: Record<PresenceStatus, string> = {
  online: "bg-emerald-500",
  away: "bg-amber-400",
  busy: "bg-red-500",
  offline: "bg-zinc-500",
  invisible: "bg-zinc-500",
};

// ─── Initials generator ───────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-violet-600",
    "bg-indigo-600",
    "bg-blue-600",
    "bg-cyan-600",
    "bg-teal-600",
    "bg-emerald-600",
    "bg-rose-600",
    "bg-orange-600",
    "bg-pink-600",
    "bg-fuchsia-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// ─── Avatar component ─────────────────────────────────────────────────────────

export function Avatar({
  src,
  displayName,
  size = "md",
  status,
  showStatus = false,
  className,
  onClick,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const showImage = src && !imgError;
  const initials = getInitials(displayName);
  const bgColor = getAvatarColor(displayName);

  return (
    <div
      className={cn("relative inline-flex shrink-0", className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      {/* Avatar image or initials */}
      <div
        className={cn(
          "rounded-full overflow-hidden flex items-center justify-center font-semibold text-white select-none",
          SIZE_CLASSES[size],
          !showImage && bgColor,
          onClick && "cursor-pointer ring-2 ring-transparent hover:ring-accent/50 transition-all"
        )}
      >
        {showImage ? (
          <img
            src={src}
            alt={displayName}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
            draggable={false}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {/* Presence indicator */}
      {showStatus && status && status !== "invisible" && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full ring-[#111827]",
            STATUS_SIZE_CLASSES[size],
            STATUS_COLORS[status]
          )}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
}

// ─── Avatar group ─────────────────────────────────────────────────────────────

export interface AvatarGroupProps {
  users: Array<{ uid: string; displayName: string; avatarUrl?: string }>;
  max?: number;
  size?: AvatarSize;
  className?: string;
}

export function AvatarGroup({ users, max = 4, size = "sm", className }: AvatarGroupProps) {
  const visible = users.slice(0, max);
  const overflow = users.length - max;

  const offsetClass: Record<AvatarSize, string> = {
    xs: "-ml-1.5",
    sm: "-ml-2",
    md: "-ml-2.5",
    lg: "-ml-3",
    xl: "-ml-4",
  };

  return (
    <div className={cn("flex items-center", className)}>
      {visible.map((user, i) => (
        <div
          key={user.uid}
          className={cn("ring-2 ring-[#111827] rounded-full", i > 0 && offsetClass[size])}
          style={{ zIndex: visible.length - i }}
        >
          <Avatar
            src={user.avatarUrl}
            displayName={user.displayName}
            size={size}
          />
        </div>
      ))}

      {overflow > 0 && (
        <div
          className={cn(
            "rounded-full bg-[#1F2937] flex items-center justify-center text-zinc-400 font-medium ring-2 ring-[#111827]",
            SIZE_CLASSES[size],
            offsetClass[size]
          )}
        >
          <span>+{overflow}</span>
        </div>
      )}
    </div>
  );
}
