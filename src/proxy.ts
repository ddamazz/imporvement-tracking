import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/auth";

/**
 * Optimistic gate: keeps unauthenticated browsers out of the app shell.
 * The real enforcement lives in `requireSession()`, which every Server Action
 * and page calls — Server Actions are reachable by direct POST, so a proxy
 * check alone would not be a security boundary.
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (isValidSession(token)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  const from = request.nextUrl.pathname + request.nextUrl.search;
  if (from !== "/") {
    loginUrl.searchParams.set("next", from);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Everything except the login page, API routes (which check the session
    // themselves and answer 401 rather than redirecting an fetch/img to
    // HTML), Next internals, and static assets.
    "/((?!login|api/|_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
