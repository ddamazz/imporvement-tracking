import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "trakker_session";

/** 400 days is the maximum lifetime browsers will honour for a cookie. */
export const SESSION_MAX_AGE = 400 * 24 * 60 * 60;

const SESSION_SUBJECT = "trakker-v1";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

/**
 * The cookie value is an HMAC of a fixed subject, so it cannot be forged by
 * hand the way a plain `authed=true` flag could. Rotating AUTH_SECRET logs
 * everyone out.
 */
export function sessionToken(): string {
  return createHmac("sha256", requiredEnv("AUTH_SECRET"))
    .update(SESSION_SUBJECT)
    .digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  // timingSafeEqual throws on length mismatch, so compare lengths first.
  return left.length === right.length && timingSafeEqual(left, right);
}

export function isValidPassword(candidate: string): boolean {
  return safeEqual(candidate, requiredEnv("TRAKKER_PASSWORD"));
}

export function isValidSession(token: string | undefined): boolean {
  if (!token) return false;
  return safeEqual(token, sessionToken());
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE,
} as const;
