"use client";

import { GripVertical, ImageIcon, MessageSquare } from "lucide-react";
import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core";
import type { IssueWithDetails } from "@/db/schema";
import { imageSrc } from "@/lib/images";
import { EffortChip, PriorityChip, StatusChip } from "./chip";
import type { OnPreview } from "./lightbox";
import { Screenshot } from "./screenshot";

/** Shared card body so list and board rows look identical. */
export function IssueCardBody({
  issue,
  onOpen,
  onPreview,
  compact = false,
}: {
  issue: IssueWithDetails;
  onOpen: () => void;
  onPreview: OnPreview;
  compact?: boolean;
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
          className={`relative shrink-0 overflow-hidden rounded-md border border-line bg-surface-2 ${
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

      <button
        type="button"
        onClick={onOpen}
        className={`flex min-w-0 flex-1 text-left ${
          compact
            ? "flex-col items-stretch"
            : "items-start justify-between gap-3"
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{issue.title}</p>
          {issue.description ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted">
              {issue.description}
            </p>
          ) : null}
        </div>
        <div
          className={`flex shrink-0 flex-wrap items-center gap-1 ${
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
          <PriorityChip value={issue.priority} />
          <EffortChip value={issue.effort} />
          {!compact ? <StatusChip value={issue.status} /> : null}
        </div>
      </button>
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
      className="mt-0.5 grid size-6 shrink-0 cursor-grab place-items-center rounded text-muted opacity-0 transition group-hover:opacity-100 active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical size={14} />
    </button>
  );
}
