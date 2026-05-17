/**
 * frontend/src/utils/sanitize.ts
 * Project: Obsidian
 */

import DOMPurify from "dompurify";

// ─── Config ───────────────────────────────────────────────────────────────────

const SAFE_TAGS = [
  "b", "i", "em", "strong", "u", "s", "del", "code", "pre",
  "br", "p", "span", "a", "ul", "ol", "li", "blockquote",
];

const SAFE_ATTRS = ["href", "target", "rel", "class"];

const MESSAGE_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: SAFE_TAGS,
  ALLOWED_ATTR: SAFE_ATTRS,
  ALLOW_DATA_ATTR: false,
  FORCE_BODY: false,
};

const STRICT_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
};

// ─── Core sanitizers ──────────────────────────────────────────────────────────

/**
 * Sanitizes HTML for safe rendering in message content.
 * Allows basic formatting tags only.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, MESSAGE_CONFIG);
}

/**
 * Strips ALL HTML tags, returning plain text only.
 * Use for previews, search snippets, and notification bodies.
 */
export function stripHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, STRICT_CONFIG);
}

/**
 * Escapes special HTML characters to prevent XSS when interpolating
 * user content into HTML strings directly.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─── Mention parsing ──────────────────────────────────────────────────────────

/**
 * Converts @mention tokens in a message string into styled HTML spans.
 * Input must already be sanitized before calling this.
 *
 * @example
 * parseMentions("Hello @Aarav!") // 'Hello <span class="mention">@Aarav</span>!'
 */
export function parseMentions(text: string): string {
  return text.replace(
    /@([a-zA-Z0-9_.-]{1,64})/g,
    '<span class="mention text-accent font-medium">@$1</span>'
  );
}

/**
 * Converts #channel references into styled spans.
 */
export function parseChannelRefs(text: string): string {
  return text.replace(
    /#([a-z0-9_-]{1,80})/g,
    '<span class="channel-ref text-accent/80 font-medium">#$1</span>'
  );
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/g;

/**
 * Wraps bare URLs in anchor tags with safe attributes.
 * Input must already be sanitized.
 */
export function linkifyUrls(text: string): string {
  return text.replace(URL_REGEX, (url) => {
    const escaped = escapeHtml(url);
    return `<a href="${escaped}" target="_blank" rel="noopener noreferrer" class="text-accent underline">${escaped}</a>`;
  });
}

/**
 * Returns true if a string appears to be a valid URL.
 */
export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

// ─── File name sanitizer ──────────────────────────────────────────────────────

/**
 * Sanitizes a file name by removing path traversal characters and
 * collapsing multiple dots/spaces.
 */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 255);
}

// ─── Input sanitizer ──────────────────────────────────────────────────────────

/**
 * Trims and collapses internal whitespace in user input strings.
 */
export function sanitizeInput(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Removes non-printable/control characters from a string.
 */
export function removeControlChars(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

// ─── Full message pipeline ────────────────────────────────────────────────────

/**
 * Full pipeline for rendering user message content safely:
 * sanitize → linkify → parse mentions → parse channel refs.
 *
 * @param raw  Raw message content string from Firestore.
 */
export function renderMessageContent(raw: string): string {
  const sanitized = sanitizeHtml(raw);
  const linked = linkifyUrls(sanitized);
  const withMentions = parseMentions(linked);
  return parseChannelRefs(withMentions);
}

/**
 * Generates a plain-text preview of message content (for notifications/search).
 */
export function messagePreview(raw: string, maxLength = 100): string {
  const plain = stripHtml(raw).trim();
  if (plain.length <= maxLength) return plain;
  return plain.slice(0, maxLength).trimEnd() + "…";
}
