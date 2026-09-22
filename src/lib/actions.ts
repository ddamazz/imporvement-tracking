"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { del } from "@vercel/blob";
import { and, asc, eq, inArray, max } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { db } from "@/db";
import { commentImages, comments, images, issues, pages } from "@/db/schema";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  isValidPassword,
  sessionToken,
} from "./auth";
import { assertSession } from "./session";
import { isUuid } from "./queries";
import {
  ANONYMOUS_AUTHOR,
  MAX_COMMENT_LENGTH,
  normaliseAuthor,
} from "./author";
import {
  type Effort,
  type Priority,
  type Status,
  isEffort,
  isPriority,
  isStatus,
} from "./constants";

/** Everything is rendered dynamically, so one sweep keeps sidebar + page fresh. */
function refresh() {
  revalidatePath("/", "layout");
}

/**
 * `db.batch` needs a non-empty tuple and Neon runs the batch as one
 * transaction — which is how multi-row writes stay atomic here, since the
 * neon-http driver has no interactive transactions.
 */
async function batchAll(writes: BatchItem<"pg">[]) {
  if (writes.length === 0) return;
  await db.batch(writes as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
}

/** Every comment attachment under the given issues. */
async function attachmentUrls(issueIds: string[]): Promise<string[]> {
  if (issueIds.length === 0) return [];
  const rows = await db
    .select({ url: commentImages.url })
    .from(commentImages)
    .innerJoin(comments, eq(commentImages.commentId, comments.id))
    .where(inArray(comments.issueId, issueIds));
  return rows.map((row) => row.url);
}

/** Blob cleanup must never block a database delete. */
async function removeBlobs(urls: string[]) {
  if (urls.length === 0) return;
  try {
    await del(urls);
  } catch (error) {
    console.error("Failed to delete blobs", error);
  }
}

/* -------------------------------------------------------------------------- */
/* Auth                                                                       */
/* -------------------------------------------------------------------------- */

export async function login(
  _prevState: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!isValidPassword(password)) {
    return { error: "That password is not right." };
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, sessionToken(), SESSION_COOKIE_OPTIONS);

  // Only allow same-origin paths, so `?next=` can't be used as an open redirect.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}

/* -------------------------------------------------------------------------- */
/* Pages                                                                      */
/* -------------------------------------------------------------------------- */

export async function createPage(title?: string) {
  await assertSession();

  const [{ value: highest } = { value: null }] = await db
    .select({ value: max(pages.position) })
    .from(pages);

  const [created] = await db
    .insert(pages)
    .values({
      title: title?.trim() || "Untitled page",
      position: (highest ?? -1) + 1,
    })
    .returning({ id: pages.id });

  refresh();
  redirect(`/p/${created.id}`);
}

export async function updatePage(
  id: string,
  patch: { title?: string; emoji?: string | null },
) {
  await assertSession();

  const values: { title?: string; emoji?: string | null } = {};
  if (patch.title !== undefined) values.title = patch.title.trim() || "Untitled page";
  if (patch.emoji !== undefined) values.emoji = patch.emoji;
  if (Object.keys(values).length === 0) return;

  await db.update(pages).set(values).where(eq(pages.id, id));
  refresh();
}

export async function deletePage(id: string) {
  await assertSession();

  // Collect blob URLs before the cascade removes the rows.
  const doomed = await db
    .select({ url: images.url })
    .from(images)
    .innerJoin(issues, eq(images.issueId, issues.id))
    .where(eq(issues.pageId, id));

  const pageIssues = await db
    .select({ id: issues.id })
    .from(issues)
    .where(eq(issues.pageId, id));
  const attachments = await attachmentUrls(pageIssues.map((row) => row.id));

  await db.delete(pages).where(eq(pages.id, id));
  await removeBlobs([...doomed.map((row) => row.url), ...attachments]);

  const [next] = await db
    .select({ id: pages.id })
    .from(pages)
    .orderBy(asc(pages.position))
    .limit(1);

  refresh();
  redirect(next ? `/p/${next.id}` : "/");
}

export async function reorderPages(orderedIds: string[]) {
  await assertSession();

  await batchAll(
    orderedIds.map((id, index) =>
      db.update(pages).set({ position: index }).where(eq(pages.id, id)),
    ),
  );

  refresh();
}

/* -------------------------------------------------------------------------- */
/* Issues                                                                     */
/* -------------------------------------------------------------------------- */

export type IssueInput = {
  id?: string;
  pageId: string;
  title: string;
  description: string;
  priority: Priority;
  effort: Effort;
  status: Status;
  images: { url: string; pathname: string }[];
};

type SaveResult = { ok: true; id: string } | { ok: false; error: string };

export async function saveIssue(input: IssueInput): Promise<SaveResult> {
  await assertSession();

  const title = input.title.trim();
  if (!title) return { ok: false, error: "Give the issue a title." };
  if (!isPriority(input.priority)) return { ok: false, error: "Invalid priority." };
  if (!isEffort(input.effort)) return { ok: false, error: "Invalid effort." };
  if (!isStatus(input.status)) return { ok: false, error: "Invalid status." };

  const fields = {
    title,
    description: input.description.trim() || null,
    priority: input.priority,
    effort: input.effort,
    status: input.status,
  };

  let issueId = input.id;

  if (issueId) {
    await db
      .update(issues)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(issues.id, issueId));
  } else {
    const [{ value: highest } = { value: null }] = await db
      .select({ value: max(issues.position) })
      .from(issues)
      .where(eq(issues.pageId, input.pageId));

    const [created] = await db
      .insert(issues)
      .values({
        ...fields,
        pageId: input.pageId,
        position: (highest ?? -1) + 1,
      })
      .returning({ id: issues.id });

    issueId = created.id;
  }

  await syncImages(issueId, input.images);

  refresh();
  return { ok: true, id: issueId };
}

/**
 * The editor stages image changes and sends the full desired list, so one call
 * covers additions, removals and reordering.
 */
async function syncImages(
  issueId: string,
  desired: { url: string; pathname: string }[],
) {
  const existing = await db
    .select({ id: images.id, url: images.url })
    .from(images)
    .where(eq(images.issueId, issueId));

  const keptUrls = new Set(desired.map((image) => image.url));
  const removed = existing.filter((image) => !keptUrls.has(image.url));

  if (removed.length > 0) {
    await db.delete(images).where(
      inArray(
        images.id,
        removed.map((image) => image.id),
      ),
    );
    await removeBlobs(removed.map((image) => image.url));
  }

  const existingByUrl = new Map(existing.map((image) => [image.url, image.id]));
  const writes = desired.map((image, index) => {
    const id = existingByUrl.get(image.url);
    return id
      ? db.update(images).set({ position: index }).where(eq(images.id, id))
      : db.insert(images).values({
          issueId,
          url: image.url,
          pathname: image.pathname,
          position: index,
        });
  });

  await batchAll(writes);
}

export async function updateIssueFields(
  id: string,
  patch: {
    priority?: Priority;
    effort?: Effort;
    status?: Status;
    marked?: boolean;
  },
) {
  await assertSession();

  const values: {
    priority?: Priority;
    effort?: Effort;
    status?: Status;
    marked?: boolean;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if (patch.priority !== undefined) {
    if (!isPriority(patch.priority)) throw new Error("Invalid priority");
    values.priority = patch.priority;
  }
  if (patch.effort !== undefined) {
    if (!isEffort(patch.effort)) throw new Error("Invalid effort");
    values.effort = patch.effort;
  }
  if (patch.status !== undefined) {
    if (!isStatus(patch.status)) throw new Error("Invalid status");
    values.status = patch.status;
  }
  if (patch.marked !== undefined) {
    if (typeof patch.marked !== "boolean") throw new Error("Invalid mark");
    values.marked = patch.marked;
  }

  await db.update(issues).set(values).where(eq(issues.id, id));
  refresh();
}

export async function deleteIssue(id: string) {
  await assertSession();

  const doomed = await db
    .select({ url: images.url })
    .from(images)
    .where(eq(images.issueId, id));
  const attachments = await attachmentUrls([id]);

  await db.delete(issues).where(eq(issues.id, id));
  await removeBlobs([...doomed.map((row) => row.url), ...attachments]);
  refresh();
}

export async function reorderIssues(pageId: string, orderedIds: string[]) {
  await assertSession();

  await batchAll(
    orderedIds.map((id, index) =>
      db
        .update(issues)
        .set({ position: index })
        // Scoped to the page so a stray id can't reposition another page's issue.
        .where(and(eq(issues.id, id), eq(issues.pageId, pageId))),
    ),
  );

  refresh();
}

/* -------------------------------------------------------------------------- */
/* Comments                                                                   */
/* -------------------------------------------------------------------------- */

export type CommentInput = {
  issueId: string;
  /** Whatever the browser has remembered in its author cookie. */
  author: string;
  body: string;
  images: { url: string; pathname: string }[];
};

type CommentResult = { ok: true; id: string } | { ok: false; error: string };

export async function addComment(input: CommentInput): Promise<CommentResult> {
  await assertSession();

  if (!isUuid(input.issueId)) return { ok: false, error: "Unknown issue." };

  const body = input.body.trim();
  if (!body && input.images.length === 0) {
    return { ok: false, error: "Write something, or attach an image." };
  }
  if (body.length > MAX_COMMENT_LENGTH) {
    return { ok: false, error: "That comment is too long." };
  }

  // The name is a label, not an identity — there are no accounts to check it
  // against, so it is only trimmed and capped.
  const author = normaliseAuthor(input.author) || ANONYMOUS_AUTHOR;

  const [created] = await db
    .insert(comments)
    .values({ issueId: input.issueId, author, body })
    .returning({ id: comments.id });

  await batchAll(
    input.images.map((image, index) =>
      db.insert(commentImages).values({
        commentId: created.id,
        url: image.url,
        pathname: image.pathname,
        position: index,
      }),
    ),
  );

  refresh();
  return { ok: true, id: created.id };
}

export async function deleteComment(id: string) {
  await assertSession();

  const doomed = await db
    .select({ url: commentImages.url })
    .from(commentImages)
    .where(eq(commentImages.commentId, id));

  await db.delete(comments).where(eq(comments.id, id));
  await removeBlobs(doomed.map((row) => row.url));
  refresh();
}

/** Called when the editor is cancelled, so freshly uploaded blobs don't leak. */
export async function discardBlobs(urls: string[]) {
  await assertSession();
  await removeBlobs(urls);
}
