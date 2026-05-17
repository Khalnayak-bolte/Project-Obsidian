/**
 * frontend/src/components/ui/Skeleton.tsx
 * Project: Obsidian
 */

import { cn } from "../../utils/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "full";
  animate?: boolean;
}

// ─── Rounded classes ──────────────────────────────────────────────────────────

const ROUNDED_CLASSES = {
  none: "rounded-none",
  sm:   "rounded-sm",
  md:   "rounded-md",
  lg:   "rounded-lg",
  xl:   "rounded-xl",
  full: "rounded-full",
};

// ─── Base Skeleton ────────────────────────────────────────────────────────────

export function Skeleton({
  className,
  width,
  height,
  rounded = "md",
  animate = true,
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-zinc-800/80",
        animate && "animate-pulse",
        ROUNDED_CLASSES[rounded],
        className
      )}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
      }}
      aria-hidden="true"
    />
  );
}

// ─── Text skeleton ────────────────────────────────────────────────────────────

export interface SkeletonTextProps {
  lines?: number;
  lastLineWidth?: string;
  className?: string;
  gap?: string;
}

export function SkeletonText({
  lines = 3,
  lastLineWidth = "60%",
  className,
  gap = "gap-2",
}: SkeletonTextProps) {
  return (
    <div className={cn("flex flex-col", gap, className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={14}
          rounded="md"
          className={cn(
            "w-full",
            i === lines - 1 && lines > 1 ? undefined : "w-full"
          )}
          style={
            i === lines - 1 && lines > 1
              ? { width: lastLineWidth }
              : undefined
          }
        />
      ))}
    </div>
  );
}

// ─── Avatar skeleton ──────────────────────────────────────────────────────────

export type SkeletonAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const AVATAR_SIZE_CLASSES: Record<SkeletonAvatarSize, string> = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
};

export interface SkeletonAvatarProps {
  size?: SkeletonAvatarSize;
  className?: string;
}

export function SkeletonAvatar({ size = "md", className }: SkeletonAvatarProps) {
  return (
    <Skeleton
      rounded="full"
      className={cn(AVATAR_SIZE_CLASSES[size], "shrink-0", className)}
    />
  );
}

// ─── Message skeleton ─────────────────────────────────────────────────────────

export interface SkeletonMessageProps {
  showAvatar?: boolean;
  lines?: number;
  className?: string;
}

export function SkeletonMessage({
  showAvatar = true,
  lines = 2,
  className,
}: SkeletonMessageProps) {
  return (
    <div className={cn("flex gap-3 px-4 py-2", className)} aria-hidden="true">
      {showAvatar && <SkeletonAvatar size="md" />}

      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        {/* Name + timestamp */}
        <div className="flex items-center gap-2">
          <Skeleton height={12} className="w-24" rounded="md" />
          <Skeleton height={10} className="w-14" rounded="md" />
        </div>

        {/* Message lines */}
        <SkeletonText lines={lines} lastLineWidth="45%" gap="gap-1.5" />
      </div>
    </div>
  );
}

// ─── Member list skeleton ─────────────────────────────────────────────────────

export interface SkeletonMemberProps {
  count?: number;
  className?: string;
}

export function SkeletonMemberList({ count = 5, className }: SkeletonMemberProps) {
  return (
    <div className={cn("flex flex-col gap-1 px-2", className)} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg">
          <SkeletonAvatar size="sm" />
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <Skeleton height={11} className="w-3/4" rounded="md" />
            <Skeleton height={9} className="w-1/2" rounded="md" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Channel list skeleton ────────────────────────────────────────────────────

export interface SkeletonChannelListProps {
  count?: number;
  className?: string;
}

export function SkeletonChannelList({
  count = 6,
  className,
}: SkeletonChannelListProps) {
  return (
    <div className={cn("flex flex-col gap-0.5 px-2", className)} aria-hidden="true">
      {/* Section header */}
      <Skeleton height={10} className="w-20 mb-2 ml-2" rounded="md" />

      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
          <Skeleton height={14} width={14} rounded="sm" />
          <Skeleton height={12} className="flex-1" rounded="md"
            style={{ width: `${50 + Math.random() * 35}%` }}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Card skeleton ────────────────────────────────────────────────────────────

export interface SkeletonCardProps {
  showImage?: boolean;
  lines?: number;
  className?: string;
}

export function SkeletonCard({
  showImage = false,
  lines = 3,
  className,
}: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "bg-[#111827] border border-zinc-700/60 rounded-xl p-4 flex flex-col gap-3",
        className
      )}
      aria-hidden="true"
    >
      {showImage && (
        <Skeleton height={160} rounded="lg" className="w-full" />
      )}

      <div className="flex items-center gap-3">
        <SkeletonAvatar size="sm" />
        <div className="flex flex-col gap-1.5 flex-1">
          <Skeleton height={12} className="w-1/2" rounded="md" />
          <Skeleton height={10} className="w-1/3" rounded="md" />
        </div>
      </div>

      <SkeletonText lines={lines} lastLineWidth="55%" gap="gap-2" />

      <div className="flex items-center gap-2 pt-1">
        <Skeleton height={28} className="w-20" rounded="lg" />
        <Skeleton height={28} className="w-16" rounded="lg" />
      </div>
    </div>
  );
}

// ─── Voice participant skeleton ───────────────────────────────────────────────

export interface SkeletonVoiceParticipantProps {
  count?: number;
  className?: string;
}

export function SkeletonVoiceParticipant({
  count = 4,
  className,
}: SkeletonVoiceParticipantProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3",
        className
      )}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-2 p-4 bg-[#111827] border border-zinc-700/60 rounded-xl"
        >
          <SkeletonAvatar size="xl" />
          <Skeleton height={12} className="w-3/4" rounded="md" />
          <div className="flex items-center gap-1.5">
            <Skeleton height={18} width={18} rounded="full" />
            <Skeleton height={18} width={18} rounded="full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Table skeleton ───────────────────────────────────────────────────────────

export interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  showHeader?: boolean;
  className?: string;
}

export function SkeletonTable({
  rows = 5,
  cols = 4,
  showHeader = true,
  className,
}: SkeletonTableProps) {
  return (
    <div className={cn("flex flex-col", className)} aria-hidden="true">
      {showHeader && (
        <div className="flex gap-4 px-4 py-2.5 border-b border-zinc-700/60">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} height={11} className="flex-1" rounded="md" />
          ))}
        </div>
      )}

      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex gap-4 px-4 py-3 border-b border-zinc-700/40"
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <Skeleton
              key={colIdx}
              height={13}
              className="flex-1"
              rounded="md"
              style={{ opacity: 1 - rowIdx * 0.1 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Full page skeleton ───────────────────────────────────────────────────────

export function SkeletonWorkspace() {
  return (
    <div className="flex h-screen bg-[#0B0F19]" aria-hidden="true">
      {/* Sidebar */}
      <div className="w-60 shrink-0 bg-[#111827] border-r border-zinc-700/60 flex flex-col gap-4 p-3">
        {/* Workspace header */}
        <div className="flex items-center gap-2 px-2 py-1">
          <Skeleton height={32} width={32} rounded="lg" />
          <Skeleton height={14} className="flex-1" rounded="md" />
          <Skeleton height={16} width={16} rounded="md" />
        </div>

        <SkeletonChannelList count={5} />
        <SkeletonChannelList count={3} />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="h-12 border-b border-zinc-700/60 flex items-center gap-3 px-4">
          <Skeleton height={16} width={16} rounded="md" />
          <Skeleton height={14} className="w-32" rounded="md" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton height={32} width={32} rounded="lg" />
            <Skeleton height={32} width={32} rounded="lg" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 flex flex-col-reverse gap-1 p-4 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonMessage key={i} lines={i % 3 === 0 ? 3 : 1} />
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-zinc-700/60">
          <Skeleton height={44} rounded="xl" className="w-full" />
        </div>
      </div>

      {/* Member list */}
      <div className="w-56 shrink-0 bg-[#111827] border-l border-zinc-700/60 p-3">
        <Skeleton height={12} className="w-16 mb-3 ml-2" rounded="md" />
        <SkeletonMemberList count={8} />
      </div>
    </div>
  );
}
