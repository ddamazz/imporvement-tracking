import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, isValidSession } from "./auth";

export async function hasSession(): Promise<boolean> {
  const store = await cookies();
  return isValidSession(store.get(SESSION_COOKIE)?.value);
}

/**
 * For Server Actions and Route Handlers. Throws rather than redirects, because
 * actions are reachable by direct POST and should simply fail.
 */
export async function assertSession(): Promise<void> {
  if (!(await hasSession())) {
    throw new Error("Unauthorized");
  }
}

/** For pages and layouts. */
export async function requireSession(): Promise<void> {
  if (!(await hasSession())) {
    redirect("/login");
  }
}
