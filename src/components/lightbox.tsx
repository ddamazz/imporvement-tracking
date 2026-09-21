"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Screenshot } from "./screenshot";

/** What a thumbnail click hands up: every image in its group, plus the one clicked. */
export type Preview = { urls: string[]; index: number };

/** The shape every thumbnail uses to open the gallery on itself. */
export type OnPreview = (urls: string[], index: number) => void;

export function Lightbox({
  urls,
  index = 0,
  onClose,
}: {
  /** The whole group, so the arrows and strip can walk through it. */
  urls: string[];
  /** Which one was clicked. */
  index?: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(() =>
    Math.min(Math.max(index, 0), Math.max(urls.length - 1, 0)),
  );

  // Clamped on every render, so a shorter list than the one clicked can never
  // leave the gallery pointing past its end.
  const safe = Math.min(current, Math.max(urls.length - 1, 0));
  const url = urls[safe];

  useEffect(() => {
    function step(delta: number) {
      setCurrent((value) => {
        const next = value + delta;
        if (next < 0 || next >= urls.length) return value;
        return next;
      });
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (urls.length < 2) return;
      if (event.key === "ArrowLeft") {
        event.stopPropagation();
        step(-1);
      }
      if (event.key === "ArrowRight") {
        event.stopPropagation();
        step(1);
      }
    }

    // Capture so the lightbox handles the key before the editor modal sees it.
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [onClose, urls.length]);

  if (!url) return null;

  const many = urls.length > 1;

  return (
    <div
      className="fixed inset-0 z-60 flex flex-col bg-black/85"
      onClick={onClose}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 p-4">
        {many ? (
          <span className="rounded-lg bg-white/10 px-2 py-1 text-xs font-medium tabular-nums text-white">
            {safe + 1} / {urls.length}
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          aria-label="Close gallery"
          onClick={onClose}
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center gap-2 px-2 sm:px-4">
        {many ? (
          <GalleryArrow
            label="Previous image"
            disabled={safe === 0}
            onClick={() => setCurrent(safe - 1)}
          >
            <ChevronLeft size={22} />
          </GalleryArrow>
        ) : null}

        <div
          className="flex min-h-0 min-w-0 flex-1 items-center justify-center"
          // A click beside the image still closes; a click on it does not.
          onClick={onClose}
        >
          <Screenshot
            key={url}
            src={url}
            onClick={(event) => event.stopPropagation()}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>

        {many ? (
          <GalleryArrow
            label="Next image"
            disabled={safe === urls.length - 1}
            onClick={() => setCurrent(safe + 1)}
          >
            <ChevronRight size={22} />
          </GalleryArrow>
        ) : null}
      </div>

      {many ? (
        <div className="shrink-0 overflow-x-auto p-4">
          <div className="mx-auto flex w-max gap-2">
            {urls.map((thumb, position) => (
              <button
                key={`${thumb}-${position}`}
                type="button"
                aria-label={`Show image ${position + 1}`}
                aria-current={position === safe}
                onClick={(event) => {
                  event.stopPropagation();
                  setCurrent(position);
                }}
                className={`h-14 w-20 shrink-0 overflow-hidden rounded-md border bg-black/40 transition ${
                  position === safe
                    ? "border-white opacity-100"
                    : "border-white/20 opacity-60 hover:opacity-100"
                }`}
              >
                <Screenshot src={thumb} className="size-full object-contain" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GalleryArrow({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:pointer-events-none disabled:opacity-25"
    >
      {children}
    </button>
  );
}
