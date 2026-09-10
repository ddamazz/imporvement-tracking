"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { IssueWithImages } from "@/db/schema";
import {
  PRIORITIES,
  PRIORITY_META,
  STATUSES,
  STATUS_META,
  type Effort,
  type Priority,
  type Status,
} from "@/lib/constants";
import { IssueCardBody } from "./issue-card";

export type GroupBy = "status" | "priority";

const COLUMN_PREFIX = "column:";

export function IssueBoard({
  issues,
  groupBy,
  onOpen,
  onPreview,
  onMove,
}: {
  issues: IssueWithImages[];
  groupBy: GroupBy;
  onOpen: (issue: IssueWithImages) => void;
  onPreview: (url: string) => void;
  /** Applies a field change and/or a new global order in one go. */
  onMove: (args: {
    id: string;
    patch?: { status?: Status; priority?: Priority; effort?: Effort };
    orderedIds?: string[];
  }) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const columns: { key: string; label: string; accent: string }[] =
    groupBy === "status"
      ? STATUSES.map((key) => ({
          key,
          label: STATUS_META[key].label,
          accent: STATUS_META[key].dot,
        }))
      : PRIORITIES.map((key) => ({
          key,
          label: PRIORITY_META[key].label,
          accent: PRIORITY_META[key].dot,
        }));

  const columnOf = (issue: IssueWithImages) =>
    groupBy === "status" ? issue.status : issue.priority;

  function onDragEnd(event: DragEndEvent) {
    setDraggingId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const dragged = issues.find((issue) => issue.id === activeId);
    if (!dragged) return;

    const overIssue = issues.find((issue) => issue.id === overId);
    const targetColumn = overId.startsWith(COLUMN_PREFIX)
      ? overId.slice(COLUMN_PREFIX.length)
      : overIssue
        ? columnOf(overIssue)
        : null;
    if (!targetColumn) return;

    const changedColumn = targetColumn !== columnOf(dragged);
    const patch = changedColumn
      ? groupBy === "status"
        ? { status: targetColumn as Status }
        : { priority: targetColumn as Priority }
      : undefined;

    // Dropping onto another card keeps the global manual order meaningful by
    // moving the dragged issue to that card's slot.
    let orderedIds: string[] | undefined;
    if (overIssue && overIssue.id !== activeId) {
      const ids = issues.map((issue) => issue.id);
      const from = ids.indexOf(activeId);
      const to = ids.indexOf(overId);
      if (from !== -1 && to !== -1) {
        ids.splice(to, 0, ids.splice(from, 1)[0]);
        orderedIds = ids;
      }
    }

    if (!patch && !orderedIds) return;
    onMove({ id: activeId, patch, orderedIds });
  }

  const dragging = issues.find((issue) => issue.id === draggingId) ?? null;

  return (
    <DndContext
      // Stable id so the generated accessibility ids match across SSR.
      id="issue-board"
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={(event) => setDraggingId(String(event.active.id))}
      onDragCancel={() => setDraggingId(null)}
      onDragEnd={onDragEnd}
    >
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
        {columns.map((column) => (
          <BoardColumn
            key={column.key}
            id={`${COLUMN_PREFIX}${column.key}`}
            label={column.label}
            accent={column.accent}
            issues={issues.filter((issue) => columnOf(issue) === column.key)}
            groupBy={groupBy}
            onOpen={onOpen}
            onPreview={onPreview}
          />
        ))}
      </div>

      <DragOverlay>
        {dragging ? (
          <div className="w-64 rounded-lg border border-line bg-surface p-2 shadow-[var(--shadow-pop)]">
            <IssueCardBody
              issue={dragging}
              onOpen={() => {}}
              onPreview={() => {}}
              compact
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function BoardColumn({
  id,
  label,
  accent,
  issues,
  groupBy,
  onOpen,
  onPreview,
}: {
  id: string;
  label: string;
  accent: string;
  issues: IssueWithImages[];
  groupBy: GroupBy;
  onOpen: (issue: IssueWithImages) => void;
  onPreview: (url: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-xl border p-2 transition ${
        isOver ? "border-accent bg-accent/5" : "border-line bg-surface-2"
      }`}
    >
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className={`size-1.5 rounded-full ${accent}`} />
        <span className="text-xs font-semibold">{label}</span>
        <span className="text-xs text-muted">{issues.length}</span>
      </div>

      <SortableContext items={issues.map((issue) => issue.id)}>
        <div className="flex min-h-16 flex-col gap-1.5">
          {issues.map((issue) => (
            <BoardCard
              key={issue.id}
              issue={issue}
              hideStatus={groupBy === "status"}
              onOpen={() => onOpen(issue)}
              onPreview={onPreview}
            />
          ))}
          {issues.length === 0 ? (
            <p className="px-1 py-3 text-[11px] text-muted">Drop issues here</p>
          ) : null}
        </div>
      </SortableContext>
    </div>
  );
}

function BoardCard({
  issue,
  hideStatus,
  onOpen,
  onPreview,
}: {
  issue: IssueWithImages;
  hideStatus: boolean;
  onOpen: () => void;
  onPreview: (url: string) => void;
}) {
  // `attributes` is deliberately not spread: it sets role="button", which would
  // nest the card's own buttons inside a button. The list view keeps the
  // keyboard-accessible drag handles.
  const { listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: issue.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...listeners}
      className={`cursor-grab rounded-lg border border-line bg-surface p-2 shadow-[var(--shadow-card)] active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      } ${issue.status === "done" ? "opacity-60" : ""}`}
    >
      <IssueCardBody
        issue={issue}
        onOpen={onOpen}
        onPreview={onPreview}
        compact={hideStatus}
      />
    </div>
  );
}
