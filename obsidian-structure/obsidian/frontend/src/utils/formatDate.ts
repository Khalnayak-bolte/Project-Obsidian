/**
 * frontend/src/utils/formatDate.ts
 * Project: Obsidian
 */

// ─── Core helpers ─────────────────────────────────────────────────────────────

function toDate(input: string | number | Date): Date {
  if (input instanceof Date) return input;
  return new Date(input);
}

// ─── Relative time ────────────────────────────────────────────────────────────

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * Returns a human-readable relative time string.
 *
 * @example
 * timeAgo(new Date(Date.now() - 30000))   // "30s ago"
 * timeAgo(new Date(Date.now() - 300000))  // "5m ago"
 * timeAgo(new Date(Date.now() - 7200000)) // "2h ago"
 */
export function timeAgo(input: string | number | Date): string {
  const date = toDate(input);
  const diff = Date.now() - date.getTime();

  if (diff < 10 * SECOND) return "just now";
  if (diff < MINUTE) return `${Math.floor(diff / SECOND)}s ago`;
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d ago`;
  if (diff < MONTH) return `${Math.floor(diff / WEEK)}w ago`;
  if (diff < YEAR) return `${Math.floor(diff / MONTH)}mo ago`;
  return `${Math.floor(diff / YEAR)}y ago`;
}

/**
 * Returns a short relative label used in message timestamps.
 * Shows time if today, "Yesterday" if yesterday, or date otherwise.
 *
 * @example
 * messageTimestamp(new Date()) // "2:45 PM"
 * messageTimestamp(yesterday)  // "Yesterday at 2:45 PM"
 * messageTimestamp(older)      // "May 10, 2025"
 */
export function messageTimestamp(input: string | number | Date): string {
  const date = toDate(input);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const timeStr = date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) return timeStr;
  if (isYesterday) return `Yesterday at ${timeStr}`;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Groups messages by date — returns the divider label for a date.
 *
 * @example
 * dateDivider(new Date())   // "Today"
 * dateDivider(yesterday)    // "Yesterday"
 * dateDivider(older)        // "Monday, May 10"
 */
export function dateDivider(input: string | number | Date): string {
  const date = toDate(input);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";

  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

// ─── Formatted dates ──────────────────────────────────────────────────────────

/**
 * Returns a short date string: "May 10, 2025"
 */
export function formatDate(input: string | number | Date): string {
  return toDate(input).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Returns a short time string: "2:45 PM"
 */
export function formatTime(input: string | number | Date): string {
  return toDate(input).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Returns a full datetime string: "May 10, 2025 at 2:45 PM"
 */
export function formatDateTime(input: string | number | Date): string {
  const date = toDate(input);
  return `${formatDate(date)} at ${formatTime(date)}`;
}

/**
 * Returns ISO date string: "2025-05-10"
 */
export function toISODate(input: string | number | Date): string {
  return toDate(input).toISOString().split("T")[0];
}

// ─── Billing ──────────────────────────────────────────────────────────────────

/**
 * Formats a billing period range.
 *
 * @example
 * billingPeriod("2025-05-01", "2025-05-31") // "May 1 – May 31, 2025"
 */
export function billingPeriod(start: string, end: string): string {
  const s = toDate(start);
  const e = toDate(end);

  const startStr = s.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const endStr = e.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return `${startStr} – ${endStr}`;
}

/**
 * Returns days remaining until a date.
 */
export function daysUntil(input: string | number | Date): number {
  const diff = toDate(input).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / DAY));
}

/**
 * Returns true if date is in the past.
 */
export function isPast(input: string | number | Date): boolean {
  return toDate(input).getTime() < Date.now();
}

/**
 * Returns true if two dates fall on the same calendar day.
 */
export function isSameDay(
  a: string | number | Date,
  b: string | number | Date
): boolean {
  const da = toDate(a);
  const db = toDate(b);
  return (
    da.getDate() === db.getDate() &&
    da.getMonth() === db.getMonth() &&
    da.getFullYear() === db.getFullYear()
  );
}
