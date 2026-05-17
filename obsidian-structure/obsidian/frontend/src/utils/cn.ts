/**
 * frontend/src/utils/cn.ts
 * Project: Obsidian
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS classes safely, resolving conflicts.
 * Combines clsx (conditional classes) with tailwind-merge (conflict resolution).
 *
 * @example
 * cn("px-4 py-2", isActive && "bg-accent", "px-6") // → "py-2 bg-accent px-6"
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
