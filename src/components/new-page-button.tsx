"use client";

import { useTransition } from "react";
import { Plus } from "lucide-react";
import { createPage } from "@/lib/actions";

export function NewPageButton({ label = "New page" }: { label?: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => createPage())}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-medium text-accent-contrast transition hover:opacity-90 disabled:opacity-60"
    >
      <Plus size={15} />
      {isPending ? "Creating…" : label}
    </button>
  );
}
