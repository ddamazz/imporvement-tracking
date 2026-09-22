"use client";

import { GripVertical, ImageIcon, MessageSquare } from "lucide-react";
import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core";
import type { IssueWithDetails } from "@/db/schema";
import type { Effort, Priority, Status } from "@/lib/constants";
import { imageSrc } from "@/lib/images";
import { EffortChip, PriorityChip, StatusChip } from "./chip";
import {
  EffortChipMenu,
  MarkButton,
  PriorityChipMenu,
  StatusChipMenu,
} from "./chip-menu";
import type { OnPreview } from "./lightbox";
import { Screenshot } from "./screenshot";

export type IssuePatch = {
  priority?: Priority;
  effort?: Effort;
  status?: Status;
  marked?: boolean;
};

/** Shared card body so list and board rows look identical. */
export function IssueCardBody({
  issue,
  onOpen,
  onPreview,
  onPatch,
  compact = false,
  stretchHitArea = false,
}: {
  issue: IssueWithDetails;
  onOpen: () => void;
  onPreview: OnPreview;
  /** When given, the chips become pickers that edit the issue in place. */
  onPatch?: (patch: IssuePatch) => void;
  compact?: boolean;
  /** Spreads the open button across the whole row via a pseudo-element, so
   *  hovering anywhere — padding, gaps, the blank space beside a short title —
   *  shows the hand and opens the issue. The row must be `relative`. Controls
   *  that must stay clickable sit above the overlay: the ones before it in the
   *  DOM need `z-[1]`, the chips after it only need `relative` — deliberately
   *  without a z-index, which would trap their popovers in a stacking context
   *  and let the next row paint over them. */
  stretchHitArea?: boolean;
}) {
  const [firstImage, ...restImages] = issue.images;
  const urls = issue.images.map((image) => imageSrc(image.id));

  return (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      {firstImage ? (
        <button
          type="button"
          aria-label={
            restImages.length > 0
              ? `View ${issue.images.length} screenshots`
              : "View screenshot"
          }
          onClick={(event) => {
            event.stopPropagation();
            onPreview(urls, 0);
          }}
          className={`relative z-[1] shrink-0 overflow-hidden rounded-md border border-line bg-surface-2 ${
            compact ? "h-12 w-16" : "h-14 w-20"
          }`}
        >
          {/* `contain` so wide screenshots stay recognisable instead of
              showing a cropped sliver of their middle. */}
          <Screenshot
            src={imageSrc(firstImage.id)}
            className="size-full cursor-zoom-in object-contain"
          />
          {restImages.length > 0 ? (
            <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[10px] font-medium text-white">
              +{restImages.length}
            </span>
          ) : null}
        </button>
      ) : (
        <div
          className={`grid shrink-0 place-items-center rounded-md border border-dashed border-line text-muted ${
            compact ? "h-12 w-16" : "h-14 w-20"
          }`}
        >
          <ImageIcon size={14} />
        </div>
      )}

      {/* The chips sit beside the open-the-issue button rather than inside it,
          so they can be pickers of their own. */}
      <div
        className={`flex min-w-0 flex-1 ${
          compact ? "flex-col items-stretch" : "items-start justify-between gap-3"
        }`}
      >
        <button
          type="button"
          onClick={onOpen}
          className={`min-w-0 flex-1 text-left ${
            stretchHitArea ? "before:absolute before:inset-0" : ""
          }`}
        >
          <p className="truncate text-sm font-medium">{issue.title}</p>
          {issue.description ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted">
              {issue.description}
            </p>
          ) : null}
        </button>
        <div
          className={`relative flex shrink-0 flex-wrap items-center gap-1 ${
            compact ? "mt-1.5" : "justify-end"
          }`}
        >
          {issue.comments.length > 0 ? (
            <span
              className="inline-flex items-center gap-1 text-[11px] leading-5 text-muted"
              title={`${issue.comments.length} ${
                issue.comments.length === 1 ? "comment" : "comments"
              }`}
            >
              <MessageSquare size={11} />
              {issue.comments.length}
            </span>
          ) : null}
          {onPatch ? (
            <>
              <MarkButton
                value={issue.marked}
                onChange={(marked) => onPatch({ marked })}
              />
              <PriorityChipMenu
                value={issue.priority}
                onChange={(priority) => onPatch({ priority })}
              />
              <EffortChipMenu
                value={issue.effort}
                onChange={(effort) => onPatch({ effort })}
              />
              {!compact ? (
                <StatusChipMenu
                  value={issue.status}
                  onChange={(status) => onPatch({ status })}
                />
              ) : null}
            </>
          ) : (
            <>
              <PriorityChip value={issue.priority} />
              <EffortChip value={issue.effort} />
              {!compact ? <StatusChip value={issue.status} /> : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function DragHandle({
  attributes,
  listeners,
}: {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
}) {
  return (
    <button
      type="button"
      aria-label="Reorder issue"
      className="relative z-[1] mt-0.5 grid size-6 shrink-0 cursor-grab place-items-center rounded text-muted opacity-0 transition group-hover:opacity-100 active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical size={14} />
    </button>
  );
}
