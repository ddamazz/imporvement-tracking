"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  Smile,
  Trash2,
} from "lucide-react";
import type { Page } from "@/db/schema";
import { PAGE_EMOJI_CHOICES } from "@/lib/constants";
import {
  createPage,
  deletePage,
  logout,
  reorderPages,
  updatePage,
} from "@/lib/actions";
import { MenuItem, Popover } from "./popover";

export function Sidebar({ pages }: { pages: Page[] }) {
  const [isPending, startTransition] = useTransition();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const pathname = usePathname();

  // Shows the dropped order immediately, then falls back to the server's
  // order once the action and its revalidation land.
  const [items, setOptimisticItems] = useOptimistic(pages);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function onDragEnd(event: DragEndEvent) {
    setDraggingId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = items.findIndex((page) => page.id === active.id);
    const to = items.findIndex((page) => page.id === over.id);
    if (from === -1 || to === -1) return;

    const next = arrayMove(items, from, to);
    startTransition(async () => {
      setOptimisticItems(next);
      await reorderPages(next.map((page) => page.id));
    });
  }

  const dragging = items.find((page) => page.id === draggingId) ?? null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-3 py-3">
        <div className="grid size-6 place-items-center rounded-md bg-text text-[11px] font-bold text-bg">
          T
        </div>
        <span className="text-sm font-semibold tracking-tight">Trakker</span>
      </div>

      <div className="flex items-center justify-between px-3 pb-1 pt-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
          Pages
        </span>
        <button
          type="button"
          aria-label="Add page"
          onClick={() => startTransition(() => createPage())}
          className="grid size-6 place-items-center rounded-md text-muted hover:bg-surface-3 hover:text-text"
        >
          <Plus size={14} />
        </button>
      </div>

      <nav
        className={`flex-1 overflow-y-auto px-1.5 pb-2 ${
          isPending ? "opacity-70" : ""
        }`}
      >
        <DndContext
          // Fixed id: dnd-kit's generated accessibility ids come from a global
          // counter, which differs between server and client and breaks
          // hydration.
          id="sidebar-pages"
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragStart={(event) => setDraggingId(String(event.active.id))}
          onDragCancel={() => setDraggingId(null)}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={items.map((page) => page.id)}
            strategy={verticalListSortingStrategy}
          >
            {items.map((page) => (
              <SidebarRow
                key={page.id}
                page={page}
                active={pathname === `/p/${page.id}`}
              />
            ))}
          </SortableContext>
          <DragOverlay>
            {dragging ? (
              <div className="flex items-center gap-2 rounded-md border border-line bg-surface px-2 py-1.5 text-sm shadow-[var(--shadow-pop)]">
                <span>{dragging.emoji ?? "📄"}</span>
                <span className="truncate">{dragging.title}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {items.length === 0 ? (
          <p className="px-2 py-6 text-xs text-muted">
            No pages yet. Use + to add one.
          </p>
        ) : null}
      </nav>

      <div className="border-t border-line p-1.5">
        <button
          type="button"
          onClick={() => startTransition(() => logout())}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted hover:bg-surface-3 hover:text-text"
        >
          <LogOut size={14} />
          Log out
        </button>
      </div>
    </div>
  );
}

function SidebarRow({ page, active }: { page: Page; active: boolean }) {
  // `null` means "not renaming" — so the row always shows the server title
  // and there is no draft to keep in sync.
  const [draft, setDraft] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: page.id });

  function commitRename() {
    const trimmed = draft?.trim();
    setDraft(null);
    if (trimmed && trimmed !== page.title) {
      startTransition(() => updatePage(page.id, { title: trimmed }));
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative flex items-center gap-1 rounded-md pr-1 ${
        active ? "bg-surface-3" : "hover:bg-surface-3/70"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <button
        type="button"
        aria-label="Reorder page"
        className="grid size-5 shrink-0 cursor-grab place-items-center text-muted opacity-0 transition group-hover:opacity-100 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={13} />
      </button>

      {draft !== null ? (
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitRename}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitRename();
            if (event.key === "Escape") setDraft(null);
          }}
          className="my-0.5 h-6 min-w-0 flex-1 rounded border border-accent bg-bg px-1 text-sm outline-none"
        />
      ) : (
        <Link
          href={`/p/${page.id}`}
          onDoubleClick={() => setDraft(page.title)}
          className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-sm"
        >
          <span className="shrink-0 text-[13px] leading-none">
            {page.emoji ?? "📄"}
          </span>
          <span className={`truncate ${active ? "font-medium" : ""}`}>
            {page.title}
          </span>
        </Link>
      )}

      <Popover
        trigger={({ toggle }) => (
          <button
            type="button"
            aria-label="Page options"
            onClick={toggle}
            className="grid size-6 place-items-center rounded text-muted opacity-0 transition hover:bg-surface-3 hover:text-text group-hover:opacity-100"
          >
            <MoreHorizontal size={14} />
          </button>
        )}
      >
        {({ close }) => (
          <>
            <MenuItem
              onClick={() => {
                close();
                setDraft(page.title);
              }}
            >
              <Pencil size={13} />
              Rename
            </MenuItem>
            <div className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted">
              <span className="inline-flex items-center gap-1">
                <Smile size={12} /> Icon
              </span>
            </div>
            <div className="grid grid-cols-8 gap-0.5 px-1 pb-1">
              {PAGE_EMOJI_CHOICES.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    close();
                    startTransition(() => updatePage(page.id, { emoji }));
                  }}
                  className="grid size-6 place-items-center rounded text-sm hover:bg-surface-3"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="my-1 h-px bg-line" />
            <MenuItem
              danger
              onClick={() => {
                close();
                if (
                  window.confirm(
                    `Delete "${page.title}" and all of its issues? This cannot be undone.`,
                  )
                ) {
                  startTransition(() => deletePage(page.id));
                }
              }}
            >
              <Trash2 size={13} />
              Delete page
            </MenuItem>
          </>
        )}
      </Popover>
    </div>
  );
}
