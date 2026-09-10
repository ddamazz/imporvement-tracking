"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, X } from "lucide-react";

export type StagedImage = { url: string; pathname: string };

const ACCEPTED = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
];

const MAX_BYTES = 15 * 1024 * 1024;

type Uploading = { key: string; name: string; percentage: number };

export function ImageDropzone({
  pageId,
  images,
  onChange,
  onUploaded,
  onPreview,
}: {
  pageId: string;
  images: StagedImage[];
  /** A state setter, so parallel uploads can each append without clobbering. */
  onChange: React.Dispatch<React.SetStateAction<StagedImage[]>>;
  /** Reports every successful upload so the editor can clean up on cancel. */
  onUploaded: (image: StagedImage) => void;
  onPreview: (url: string) => void;
}) {
  const [uploads, setUploads] = useState<Uploading[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isOver, setIsOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const usable = files.filter((file) => file.type.startsWith("image/"));
      if (usable.length === 0) return;

      setError(null);

      await Promise.all(
        usable.map(async (file) => {
          if (!ACCEPTED.includes(file.type)) {
            setError(`${file.type || "That file"} is not a supported image.`);
            return;
          }
          if (file.size > MAX_BYTES) {
            setError(`${file.name} is larger than 15 MB.`);
            return;
          }

          const key = `${file.name}-${crypto.randomUUID()}`;
          setUploads((current) => [
            ...current,
            { key, name: file.name, percentage: 0 },
          ]);

          try {
            const blob = await upload(
              `audits/${pageId}/${file.name || "screenshot.png"}`,
              file,
              {
                access: "public",
                handleUploadUrl: "/api/blob/upload",
                contentType: file.type,
                onUploadProgress: ({ percentage }) => {
                  setUploads((current) =>
                    current.map((item) =>
                      item.key === key ? { ...item, percentage } : item,
                    ),
                  );
                },
              },
            );

            const staged = { url: blob.url, pathname: blob.pathname };
            onUploaded(staged);
            onChange((current) => [...current, staged]);
          } catch (cause) {
            const message =
              cause instanceof Error
                ? cause.message
                : `Could not upload ${file.name}.`;
            // The token route fails this way when the Blob store isn't set up,
            // which is the most likely cause on a fresh checkout.
            setError(
              /client token/i.test(message)
                ? "Image uploads aren't configured yet — add BLOB_READ_WRITE_TOKEN to .env.local and restart the server."
                : message,
            );
          } finally {
            setUploads((current) => current.filter((item) => item.key !== key));
          }
        }),
      );
    },
    [pageId, onChange, onUploaded],
  );

  // Paste a screenshot straight in — the whole point of the tool.
  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const files = Array.from(event.clipboardData?.files ?? []);
      const imageFiles = files.filter((file) => file.type.startsWith("image/"));
      if (imageFiles.length === 0) return;
      event.preventDefault();
      void uploadFiles(imageFiles);
    }

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [uploadFiles]);

  function move(index: number, delta: number) {
    onChange((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsOver(false);
          void uploadFiles(Array.from(event.dataTransfer.files));
        }}
        className={`rounded-lg border border-dashed p-2 transition ${
          isOver ? "border-accent bg-accent/5" : "border-line"
        }`}
      >
        {images.length > 0 || uploads.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {images.map((image, index) => (
              <div
                key={image.url}
                className="group relative aspect-4/3 overflow-hidden rounded-md border border-line bg-surface-2"
              >
                {/* Blob URLs are remote and arbitrary in size; a plain img keeps
                    this simple and avoids optimizing throwaway screenshots. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt=""
                  className="size-full cursor-zoom-in object-cover"
                  onClick={() => onPreview(image.url)}
                />
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() =>
                    onChange((current) =>
                      current.filter((item) => item.url !== image.url),
                    )
                  }
                  className="absolute right-1 top-1 grid size-5 place-items-center rounded bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
                <div className="absolute bottom-1 left-1 flex gap-0.5 opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    aria-label="Move image left"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    className="grid size-5 place-items-center rounded bg-black/60 text-white disabled:opacity-30"
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <button
                    type="button"
                    aria-label="Move image right"
                    disabled={index === images.length - 1}
                    onClick={() => move(index, 1)}
                    className="grid size-5 place-items-center rounded bg-black/60 text-white disabled:opacity-30"
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            ))}

            {uploads.map((item) => (
              <div
                key={item.key}
                className="grid aspect-4/3 place-items-center rounded-md border border-line bg-surface-2 text-muted"
              >
                <div className="flex flex-col items-center gap-1">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-[10px]">{item.percentage}%</span>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="grid aspect-4/3 place-items-center rounded-md border border-dashed border-line text-muted hover:border-accent hover:text-text"
            >
              <ImagePlus size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-1 rounded-md px-3 py-6 text-muted hover:text-text"
          >
            <ImagePlus size={18} />
            <span className="text-xs font-medium">
              Paste a screenshot, drop files, or click to browse
            </span>
            <span className="text-[11px]">PNG, JPG, GIF, WebP up to 15 MB</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        multiple
        hidden
        onChange={(event) => {
          void uploadFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />

      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
