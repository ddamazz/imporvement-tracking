"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login } from "@/lib/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 w-full rounded-lg bg-accent text-sm font-medium text-accent-contrast transition hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Checking…" : "Continue"}
    </button>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(login, {});

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]"
    >
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-xs font-medium text-muted">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          className="h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm outline-none focus:border-accent"
        />
      </div>
      {state?.error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
