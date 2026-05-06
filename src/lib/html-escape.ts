/**
 * Minimal HTML-entity escape for interpolating untrusted strings
 * into email/HTML templates.
 *
 * Email clients vary wildly in what they sanitize. Don't rely on
 * the recipient's MUA to neutralize injected tags — escape at
 * compose time. This is the smallest correct table for the
 * contexts we actually use (text inside element bodies, attribute
 * values within double quotes).
 */
export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
