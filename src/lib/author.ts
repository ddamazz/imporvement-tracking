/**
 * Who is commenting, remembered in a plain cookie.
 *
 * There are no accounts — everyone shares one password — so a name is just a
 * label the browser keeps. The cookie is deliberately readable by scripts:
 * the composer reads it back to pre-fill "Comment as", and each browser ends
 * up with its own name without a login flow.
 */

export const AUTHOR_COOKIE = "trakker_author";

/** Matches the session cookie, which is the longest browsers will honour. */
const AUTHOR_MAX_AGE = 400 * 24 * 60 * 60;

export const MAX_AUTHOR_LENGTH = 40;
export const MAX_COMMENT_LENGTH = 5000;

/** Used when someone comments without giving a name. */
export const ANONYMOUS_AUTHOR = "Anonymous";

export function normaliseAuthor(value: string): string {
  // Collapse whitespace so names can't be padded into looking like headings.
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_AUTHOR_LENGTH);
}

export function readAuthor(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${AUTHOR_COOKIE}=`));
  if (!match) return "";
  try {
    return normaliseAuthor(decodeURIComponent(match.slice(AUTHOR_COOKIE.length + 1)));
  } catch {
    return "";
  }
}

export function writeAuthor(value: string): void {
  if (typeof document === "undefined") return;
  const name = normaliseAuthor(value);
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = name
    ? `${AUTHOR_COOKIE}=${encodeURIComponent(name)}; path=/; max-age=${AUTHOR_MAX_AGE}; samesite=lax${secure}`
    : `${AUTHOR_COOKIE}=; path=/; max-age=0; samesite=lax${secure}`;
}

/** A stable colour per name, so the same person looks the same everywhere. */
export function authorColor(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 360;
  }
  return `oklch(0.62 0.13 ${hash})`;
}

export function authorInitials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : ""))
    .toUpperCase();
}
