"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import type { Page } from "@/db/schema";
import { Sidebar } from "./sidebar";

export function AppShell({
  pages,
  children,
}: {
  pages: Page[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // The drawer remembers which route it was opened on, so navigating (or going
  // back) closes it without an effect that syncs state to the pathname.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const drawerOpen = openedOn === pathname;
  const setDrawerOpen = (open: boolean) => setOpenedOn(open ? pathname : null);

  return (
    <div className="flex min-h-dvh flex-1">
      {/* Desktop sidebar */}
      <div className="hidden w-60 shrink-0 border-r border-line bg-surface-2 md:block">
        <Sidebar pages={pages} />
      </div>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-line bg-surface-2 shadow-[var(--shadow-pop)]">
            <Sidebar pages={pages} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 items-center gap-2 border-b border-line px-3 md:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(!drawerOpen)}
            aria-label="Toggle menu"
            className="grid size-8 place-items-center rounded-md hover:bg-surface-3"
          >
            {drawerOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
          <span className="text-sm font-semibold">Trakker</span>
        </div>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
