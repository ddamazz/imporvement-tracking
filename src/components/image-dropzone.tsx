"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, X } from "lucide-react";
import { type StagedImage, uploadImage } from "@/lib/images";

const ACCEPTED = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
];

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
  const [pending, setPending] = useState<string[]>([]);
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
          const key = `${file.name}-${crypto.randomUUID()}`;
          setPending((current) => [...current, key]);
          try {
            const blob = await uploadImage(file, pageId);
            // Preview from the local file: the stored blob is private and only
            // gets an /api/images/<id> URL once the issue is saved.
            const staged = { ...blob, previewUrl: URL.createObjectURL(file) };
            onUploaded(staged);
            onChange((current) => [...current, staged]);
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : `Could not upload ${file.name}.`,
            );
          } finally {
            setPending((current) => current.filter((item) => item !== key));
          }
        }),
      );
    },
    [pageId, onChange, onUploaded],
  );

  // Paste a screenshot straight in — the whole point of the tool. Bound to the
  // document so it works while the caret is in the title or description.
  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
        file.type.startsWith("image/"),
      );
      if (files.length === 0) return;
      event.preventDefault();
      void uploadFiles(files);
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
        {images.length > 0 || pending.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {images.map((image, index) => (
              <div
                key={image.url}
                className="group relative aspect-4/3 overflow-hidden rounded-md border border-line bg-surface-2"
              >
                {/* Screenshots are arbitrary throwaway sizes behind an auth
                    proxy, so next/image optimisation buys nothing here. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.previewUrl}
                  alt=""
                  // `contain`, not `cover`: audit screenshots are often very
                  // wide, and cropping to the centre of a 4:3 box can hide the
                  // very thing the screenshot was taken to show.
                  className="size-full cursor-zoom-in object-contain"
                  onClick={() => onPreview(image.previewUrl)}
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

            {pending.map((key) => (
              <div
                key={key}
                className="grid aspect-4/3 place-items-center rounded-md border border-line bg-surface-2 text-muted"
              >
                <Loader2 size={16} className="animate-spin" />
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
            <span className="text-[11px]">PNG, JPG, GIF, WebP</span>
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
