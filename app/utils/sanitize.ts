/**
 * Security & sanitization helpers for DOM rendering, inline scripts, URLs, and IDs.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escapes untrusted text for safe insertion into HTML text nodes or double/single-quoted attributes.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] || ch);
}

/**
 * Serializes data to JSON safe for embedding inside an inline HTML <script> block.
 * Neutralizes '</script>' breakouts and line-separator characters.
 */
export function safeJsonForScript(data: unknown): string {
  const json = JSON.stringify(data);
  if (json === undefined) return "null";
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates that a string is a canonical UUID before interpolating into PostgREST filters.
 */
export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value.trim());
}

/**
 * Validates that a URL uses an allowed http(s) or blob scheme (blocks javascript:, data:, etc.).
 */
export function isSafeHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl, window.location.origin);
    return parsed.protocol === "https:" || parsed.protocol === "http:" || parsed.protocol === "blob:";
  } catch {
    return false;
  }
}

const ALLOWED_DATA_URI_MIME = /^data:(application\/pdf|image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=]+)$/;

/**
 * Safely converts an allowlisted base64 data URI (PDF or raster image) into a Blob URL
 * so it can be opened without using document.write or rendering active HTML/SVG content.
 */
export function dataUriToBlobUrl(dataUri: string): string | null {
  const match = dataUri.trim().match(ALLOWED_DATA_URI_MIME);
  if (!match) return null;

  const mimeType = match[1];
  const base64 = match[2];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}
