"use client";

import { useRef, useState } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import type { IssueWithImages } from "@/db/schema";
import {
  EFFORTS,
  PRIORITIES,
  STATUSES,
  type Effort,
  type Priority,
  type Status,
} from "@/lib/constants";
import { deleteIssue, discardBlobs, saveIssue } from "@/lib/actions";
import { EffortChip, PriorityChip, StatusChip } from "./chip";
import { ImageDropzone, type StagedImage } from "./image-dropzone";
import { Lightbox } from "./lightbox";
import { OptionPicker } from "./option-picker";

export function IssueEditor({
  pageId,
  issue,
  onClose,
}: {
  pageId: string;
  issue: IssueWithImages | null;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(issue?.title ?? "");
  const [description, setDescription] = useState(issue?.description ?? "");
  const [priority, setPriority] = useState<Priority>(issue?.priority ?? "medium");
  const [effort, setEffort] = useState<Effort>(issue?.effort ?? "medium");
  const [status, setStatus] = useState<Status>(issue?.status ?? "open");
  const [images, setImages] = useState<StagedImage[]>(
    issue?.images.map((image) => ({
      url: image.url,
      pathname: image.pathname,
    })) ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Blobs uploaded during this session; discarded if the editor is cancelled.
  const uploadedRef = useRef<StagedImage[]>([]);
  const originalUrls = useRef(new Set(issue?.images.map((i) => i.url) ?? []));

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError(null);

    const result = await saveIssue({
      id: issue?.id,
      pageId,
      title,
      description,
      priority,
      effort,
      status,
      images,
    });

    if (result.ok) {
      onClose();
    } else {
      setError(result.error);
      setSaving(false);
    }
  }

  function handleCancel() {
    // Anything uploaded but not saved would otherwise sit in Blob forever.
    const orphans = uploadedRef.current
      .filter((image) => !originalUrls.current.has(image.url))
      .map((image) => image.url);
    if (orphans.length > 0) {
      void discardBlobs(orphans);
    }
    onClose();
  }

  // Handled on the dialog rather than the document, so the shortcuts always
  // see current state without a render-time ref.
  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      handleCancel();
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void handleSave();
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
        onKeyDown={onKeyDown}
        onClick={(event) => {
          if (event.target === event.currentTarget) handleCancel();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={issue ? "Edit issue" : "New issue"}
          className="w-full max-w-2xl rounded-xl border border-line bg-surface shadow-[var(--shadow-pop)]"
        >
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">
              {issue ? "Edit issue" : "New issue"}
            </h2>
            <div className="flex items-center gap-1">
              {issue ? (
                <button
                  type="button"
                  aria-label="Delete issue"
                  onClick={() => {
                    if (
                      window.confirm("Delete this issue? This cannot be undone.")
                    ) {
                      void deleteIssue(issue.id);
                      onClose();
                    }
                  }}
                  className="grid size-7 place-items-center rounded-md text-muted hover:bg-surface-3 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 size={15} />
                </button>
              ) : null}
              <button
                type="button"
                aria-label="Close"
                onClick={handleCancel}
                className="grid size-7 place-items-center rounded-md text-muted hover:bg-surface-3 hover:text-text"
              >
                <X size={16} />
              </button>
            </div>
          </header>

          <div className="space-y-4 p-4">
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What's wrong?"
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-base font-medium outline-none focus:border-accent"
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <OptionPicker
                label="Priority"
                options={PRIORITIES}
                value={priority}
                onChange={setPriority}
                renderOption={(option) => <PriorityChip value={option} />}
              />
              <OptionPicker
                label="Effort"
                options={EFFORTS}
                value={effort}
                onChange={setEffort}
                renderOption={(option) => <EffortChip value={option} />}
              />
              <OptionPicker
                label="Status"
                options={STATUSES}
                value={status}
                onChange={setStatus}
                renderOption={(option) => <StatusChip value={option} />}
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted">Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="Where it happens, how to reproduce it, what it should do instead…"
                className="w-full resize-y rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted">Screenshots</span>
              <ImageDropzone
                pageId={pageId}
                images={images}
                onChange={setImages}
                onUploaded={(image) => uploadedRef.current.push(image)}
                onPreview={setPreview}
              />
            </div>

            {error ? (
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            ) : null}
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
            <span className="hidden text-[11px] text-muted sm:block">
              ⌘↵ to save · Esc to cancel
            </span>
            <div className="flex w-full gap-2 sm:w-auto">
              <button
                type="button"
                onClick={handleCancel}
                className="h-9 flex-1 rounded-lg border border-line px-3 text-sm hover:bg-surface-3 sm:flex-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-medium text-accent-contrast transition hover:opacity-90 disabled:opacity-60 sm:flex-none"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </footer>
        </div>
      </div>

      {preview ? (
        <Lightbox url={preview} onClose={() => setPreview(null)} />
      ) : null}
    </>
  );
}
