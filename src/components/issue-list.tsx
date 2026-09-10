"use client";

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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import type { IssueWithImages } from "@/db/schema";
import { DragHandle, IssueCardBody } from "./issue-card";

export function IssueList({
  issues,
  sortable,
  onOpen,
  onPreview,
  onReorder,
}: {
  issues: IssueWithImages[];
  /** Reordering only makes sense while the list is in manual order. */
  sortable: boolean;
  onOpen: (issue: IssueWithImages) => void;
  onPreview: (url: string) => void;
  onReorder: (orderedIds: string[]) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function onDragEnd(event: DragEndEvent) {
    setDraggingId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = issues.map((issue) => issue.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;

    const next = [...ids];
    next.splice(to, 0, next.splice(from, 1)[0]);
    onReorder(next);
  }

  const dragging = issues.find((issue) => issue.id === draggingId) ?? null;

  return (
    <DndContext
      // Stable id so the generated accessibility ids match across SSR.
      id="issue-list"
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={(event) => setDraggingId(String(event.active.id))}
      onDragCancel={() => setDraggingId(null)}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={issues.map((issue) => issue.id)}
        strategy={verticalListSortingStrategy}
        disabled={!sortable}
      >
        <ul className="space-y-1.5">
          {issues.map((issue) => (
            <IssueRow
              key={issue.id}
              issue={issue}
              sortable={sortable}
              onOpen={() => onOpen(issue)}
              onPreview={onPreview}
            />
          ))}
        </ul>
      </SortableContext>

      <DragOverlay>
        {dragging ? (
          <div className="flex items-start gap-2 rounded-lg border border-line bg-surface p-2 shadow-[var(--shadow-pop)]">
            <IssueCardBody
              issue={dragging}
              onOpen={() => {}}
              onPreview={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function IssueRow({
  issue,
  sortable,
  onOpen,
  onPreview,
}: {
  issue: IssueWithImages;
  sortable: boolean;
  onOpen: () => void;
  onPreview: (url: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: issue.id, disabled: !sortable });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-start gap-1 rounded-lg border border-line bg-surface p-2 shadow-[var(--shadow-card)] transition hover:border-muted/40 ${
        isDragging ? "opacity-40" : ""
      } ${issue.status === "done" ? "opacity-55" : ""}`}
    >
      {sortable ? (
        <DragHandle attributes={attributes} listeners={listeners} />
      ) : (
        <span className="w-1" />
      )}
      <IssueCardBody issue={issue} onOpen={onOpen} onPreview={onPreview} />
    </li>
  );
}
