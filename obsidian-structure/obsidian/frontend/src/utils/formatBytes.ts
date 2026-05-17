/**
 * frontend/src/utils/formatBytes.ts
 * Project: Obsidian
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ByteUnit = "B" | "KB" | "MB" | "GB" | "TB";

export interface FormatBytesOptions {
  /** Number of decimal places. Default: 1 */
  decimals?: number;
  /** Force a specific unit instead of auto-selecting. */
  unit?: ByteUnit;
  /** Include the unit label in the output. Default: true */
  showUnit?: boolean;
}

// ─── Core formatter ───────────────────────────────────────────────────────────

const UNITS: ByteUnit[] = ["B", "KB", "MB", "GB", "TB"];
const THRESHOLD = 1024;

/**
 * Formats a byte count into a human-readable string.
 *
 * @example
 * formatBytes(1024)               // "1 KB"
 * formatBytes(1536, { decimals: 2 }) // "1.50 KB"
 * formatBytes(5242880)            // "5 MB"
 */
export function formatBytes(
  bytes: number,
  options: FormatBytesOptions = {}
): string {
  const { decimals = 1, unit, showUnit = true } = options;

  if (bytes === 0) return showUnit ? "0 B" : "0";
  if (bytes < 0) return showUnit ? "0 B" : "0";

  let value: number;
  let selectedUnit: ByteUnit;

  if (unit) {
    const unitIndex = UNITS.indexOf(unit);
    value = bytes / Math.pow(THRESHOLD, unitIndex);
    selectedUnit = unit;
  } else {
    const i = Math.min(
      Math.floor(Math.log(bytes) / Math.log(THRESHOLD)),
      UNITS.length - 1
    );
    value = bytes / Math.pow(THRESHOLD, i);
    selectedUnit = UNITS[i];
  }

  const formatted =
    value % 1 === 0 ? value.toString() : value.toFixed(decimals);

  return showUnit ? `${formatted} ${selectedUnit}` : formatted;
}

// ─── Specific formatters ──────────────────────────────────────────────────────

/** Formats bytes as KB (always). */
export function formatKB(bytes: number, decimals = 1): string {
  return formatBytes(bytes, { unit: "KB", decimals });
}

/** Formats bytes as MB (always). */
export function formatMB(bytes: number, decimals = 1): string {
  return formatBytes(bytes, { unit: "MB", decimals });
}

/** Formats bytes as GB (always). */
export function formatGB(bytes: number, decimals = 2): string {
  return formatBytes(bytes, { unit: "GB", decimals });
}

// ─── Storage progress ─────────────────────────────────────────────────────────

/**
 * Returns a human-readable storage usage string.
 *
 * @example
 * formatStorageUsage(536870912, 5368709120) // "512 MB / 5 GB"
 */
export function formatStorageUsage(usedBytes: number, totalBytes: number): string {
  return `${formatBytes(usedBytes)} / ${formatBytes(totalBytes)}`;
}

/**
 * Returns usage as a percentage string.
 *
 * @example
 * formatStoragePercent(512, 5368709120) // "0.0%"
 */
export function formatStoragePercent(usedBytes: number, totalBytes: number): string {
  if (totalBytes === 0) return "0%";
  const percent = Math.min((usedBytes / totalBytes) * 100, 100);
  return `${percent.toFixed(1)}%`;
}

/**
 * Returns the storage percent as a number (0-100), clamped.
 */
export function storagePercent(usedBytes: number, totalBytes: number): number {
  if (totalBytes === 0) return 0;
  return Math.min(Math.round((usedBytes / totalBytes) * 100), 100);
}

// ─── File size validation ─────────────────────────────────────────────────────

/**
 * Returns true if the file size is within the given limit.
 */
export function isWithinSizeLimit(sizeBytes: number, limitBytes: number): boolean {
  return sizeBytes <= limitBytes;
}

/**
 * Returns a human-readable file size limit string.
 *
 * @example
 * fileSizeLimitLabel(26214400) // "25 MB"
 */
export function fileSizeLimitLabel(limitBytes: number): string {
  return formatBytes(limitBytes, { decimals: 0 });
}
