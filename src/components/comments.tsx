"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Check, Link2, Loader2, Send, Trash2 } from "lucide-react";
import type { CommentWithImages } from "@/db/schema";
import { addComment, deleteComment, discardBlobs } from "@/lib/actions";
import {
  MAX_AUTHOR_LENGTH,
  MAX_COMMENT_LENGTH,
  authorColor,
  authorInitials,
  readAuthor,
  writeAuthor,
} from "@/lib/author";
import { imageSrc, type StagedImage } from "@/lib/images";
import { ImageDropzone, hasFocusWithin } from "./image-dropzone";
import { Screenshot } from "./screenshot";

/** A link that reopens this issue with the comment scrolled to and lit up. */
export function commentLink(
  pageId: string,
  issueId: string,
  commentId: string,
): string {
  return `${window.location.origin}/p/${pageId}?issue=${issueId}&comment=${commentId}`;
}

const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

function relativeTime(value: Date | string): string {
  const seconds = (new Date(value).getTime() - Date.now()) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) {
      return RELATIVE.format(Math.round(seconds / size), unit);
    }
  }
  return "just now";
}

export function Comments({
  pageId,
  issueId,
  comments,
  focusCommentId,
  onPreview,
  composerRef,
}: {
  pageId: string;
  /** `null` while the issue is still unsaved and has nothing to hang off. */
  issueId: string | null;
  comments: CommentWithImages[];
  /** Comment to scroll to and highlight, from a shared link. */
  focusCommentId?: string | null;
  onPreview: (url: string) => void;
  /**
   * Owned by the editor, which needs it to know whether a paste belongs to the
   * composer or to the issue's own screenshots.
   */
  composerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!focusCommentId) return;
    const node = listRef.current?.querySelector(
      `[data-comment="${focusCommentId}"]`,
    );
    node?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focusCommentId, comments.length]);

  return (
    <section className="space-y-2">
      <span className="text-xs font-medium text-muted">
        Comments{comments.length > 0 ? ` · ${comments.length}` : ""}
      </span>

      {issueId === null ? (
        <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-xs text-muted">
          Save the issue first — then anyone with the link can discuss it here.
        </p>
      ) : (
        <>
          {comments.length > 0 ? (
            <ul ref={listRef} className="space-y-2">
              {comments.map((comment) => (
                <CommentRow
                  key={comment.id}
                  comment={comment}
                  pageId={pageId}
                  issueId={issueId}
                  highlighted={comment.id === focusCommentId}
                  onPreview={onPreview}
                />
              ))}
            </ul>
          ) : null}

          <Composer
            pageId={pageId}
            issueId={issueId}
            onPreview={onPreview}
            composerRef={composerRef}
          />
        </>
      )}
    </section>
  );
}

function CommentRow({
  comment,
  pageId,
  issueId,
  highlighted,
  onPreview,
}: {
  comment: CommentWithImages;
  pageId: string;
  issueId: string;
  highlighted: boolean;
  onPreview: (url: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  async function copyLink() {
    const url = commentLink(pageId, issueId, comment.id);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // No clipboard access (an insecure origin, usually) — show the link so
      // it can still be copied by hand rather than failing silently.
      window.prompt("Copy this link", url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <li
      data-comment={comment.id}
      className={`group rounded-lg border bg-surface-2 p-2.5 transition ${
        highlighted ? "border-accent ring-2 ring-accent/40" : "border-line"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          style={{ backgroundColor: authorColor(comment.author) }}
          className="grid size-5 shrink-0 place-items-center rounded-full text-[9px] font-semibold text-white"
        >
          {authorInitials(comment.author)}
        </span>
        <span className="truncate text-xs font-medium">{comment.author}</span>
        <time
          dateTime={new Date(comment.createdAt).toISOString()}
          title={new Date(comment.createdAt).toLocaleString()}
          className="shrink-0 text-[11px] text-muted"
        >
          {relativeTime(comment.createdAt)}
        </time>

        <div className="ml-auto flex items-center gap-0.5 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
          <button
            type="button"
            aria-label="Copy link to this comment"
            title="Copy link to this comment"
            onClick={() => void copyLink()}
            className="grid size-6 place-items-center rounded-md text-muted hover:bg-surface-3 hover:text-text"
          >
            {copied ? <Check size={13} /> : <Link2 size={13} />}
          </button>
          <button
            type="button"
            aria-label="Delete comment"
            onClick={() => {
              if (window.confirm("Delete this comment?")) {
                startTransition(() => deleteComment(comment.id));
              }
            }}
            className="grid size-6 place-items-center rounded-md text-muted hover:bg-surface-3 hover:text-red-600 dark:hover:text-red-400"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {comment.body ? (
        <p className="mt-1.5 whitespace-pre-wrap break-words text-sm">
          {comment.body}
        </p>
      ) : null}

      {comment.images.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {comment.images.map((image) => (
            <button
              key={image.id}
              type="button"
              aria-label="View attachment"
              onClick={() => onPreview(imageSrc(image.id))}
              className="h-16 w-24 overflow-hidden rounded-md border border-line bg-surface"
            >
              <Screenshot
                src={imageSrc(image.id)}
                className="size-full cursor-zoom-in object-contain"
              />
            </button>
          ))}
        </div>
      ) : null}
    </li>
  );
}

function Composer({
  pageId,
  issueId,
  onPreview,
  composerRef,
}: {
  pageId: string;
  issueId: string;
  onPreview: (url: string) => void;
  composerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<StagedImage[]>([]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Attachments uploaded from this composer, so unposted ones can be cleaned up.
  const uploadedRef = useRef<StagedImage[]>([]);

  // The name lives in a cookie, so every browser gets its own without a login.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of an external store
    setAuthor(readAuthor());
  }, []);

  // Anything uploaded but never posted would otherwise sit in Blob forever.
  useEffect(() => {
    const uploaded = uploadedRef;
    return () => {
      const orphans = uploaded.current.map((image) => image.url);
      if (orphans.length > 0) void discardBlobs(orphans);
    };
  }, []);

  async function post() {
    if (posting) return;
    const trimmed = body.trim();
    if (!trimmed && images.length === 0) return;

    setPosting(true);
    setError(null);
    writeAuthor(author);

    try {
      const result = await addComment({
        issueId,
        author,
        body: trimmed,
        images: images.map(({ url, pathname }) => ({ url, pathname })),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      // Posted attachments now belong to the comment; anything staged and then
      // removed before posting is still this composer's to clean up.
      const kept = new Set(images.map((image) => image.url));
      const orphans = uploadedRef.current
        .filter((image) => !kept.has(image.url))
        .map((image) => image.url);
      if (orphans.length > 0) void discardBlobs(orphans);

      uploadedRef.current = [];
      setBody("");
      setImages([]);
    } catch {
      setError("That comment could not be posted.");
    } finally {
      setPosting(false);
    }
  }

  const canPost = Boolean(body.trim()) || images.length > 0;

  const claimPaste = useCallback(
    () => hasFocusWithin(composerRef),
    [composerRef],
  );

  return (
    <div
      ref={composerRef}
      className="space-y-2 rounded-lg border border-line bg-surface-2 p-2.5"
    >
      <label className="flex items-center gap-2">
        <span className="shrink-0 text-[11px] font-medium text-muted">
          Comment as
        </span>
        <input
          value={author}
          maxLength={MAX_AUTHOR_LENGTH}
          onChange={(event) => setAuthor(event.target.value)}
          // Remembered as soon as it is typed, so a comment posted from
          // another tab still carries the name.
          onBlur={() => writeAuthor(author)}
          placeholder="Your name"
          className="h-7 min-w-0 flex-1 rounded-md border border-line bg-bg px-2 text-xs outline-none focus:border-accent"
        />
      </label>

      <textarea
        value={body}
        maxLength={MAX_COMMENT_LENGTH}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            // Stop the editor's ⌘↵ from saving the issue as well.
            event.stopPropagation();
            void post();
          }
          // Escape closes the whole editor. Step out of the box first, so a
          // half-written comment isn't thrown away by a stray keypress.
          if (event.key === "Escape" && body.trim()) {
            event.stopPropagation();
            event.currentTarget.blur();
          }
        }}
        rows={2}
        placeholder="Add a comment… paste an image to attach it"
        className="w-full resize-y rounded-md border border-line bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent"
      />

      <ImageDropzone
        pageId={pageId}
        images={images}
        onChange={setImages}
        onUploaded={(image) => uploadedRef.current.push(image)}
        onPreview={onPreview}
        compact
        emptyLabel="Attach an image"
        // Only claim a paste while the caret is in the composer; otherwise the
        // image belongs to the issue's own screenshots.
        capturePaste={claimPaste}
      />

      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <span className="hidden text-[11px] text-muted sm:block">
          ⌘↵ to comment
        </span>
        <button
          type="button"
          onClick={() => void post()}
          disabled={posting || !canPost}
          className="inline-flex h-7 items-center gap-1.5 rounded-md bg-accent px-2.5 text-xs font-medium text-accent-contrast transition hover:opacity-90 disabled:opacity-50"
        >
          {posting ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Send size={12} />
          )}
          {posting ? "Posting…" : "Comment"}
        </button>
      </div>
    </div>
  );
}
