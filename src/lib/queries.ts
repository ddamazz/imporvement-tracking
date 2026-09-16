import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { commentImages, images, pages } from "@/db/schema";
import type { IssueWithDetails, Page } from "@/db/schema";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres errors on a malformed uuid, so filter obvious junk out first. */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export async function getPages(): Promise<Page[]> {
  return db.select().from(pages).orderBy(asc(pages.position), asc(pages.createdAt));
}

export async function getPage(id: string): Promise<Page | null> {
  if (!isUuid(id)) return null;
  const [page] = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
  return page ?? null;
}

export async function getIssues(pageId: string): Promise<IssueWithDetails[]> {
  if (!isUuid(pageId)) return [];
  return db.query.issues.findMany({
    where: (issue, { eq: equals }) => equals(issue.pageId, pageId),
    orderBy: (issue, { asc: ascending }) => [
      ascending(issue.position),
      ascending(issue.createdAt),
    ],
    with: {
      images: {
        orderBy: (image, { asc: ascending }) => [ascending(image.position)],
      },
      // Loaded with the page so a card can show its comment count and an
      // open editor picks up new comments from the same revalidation.
      comments: {
        orderBy: (comment, { asc: ascending }) => [ascending(comment.createdAt)],
        with: {
          images: {
            orderBy: (image, { asc: ascending }) => [ascending(image.position)],
          },
        },
      },
    },
  });
}

/**
 * Both kinds of upload are served by `/api/images/[id]`, so the id could belong
 * to either table. Ids are uuids, so there is no ambiguity between them.
 */
export async function findImageUrl(id: string): Promise<string | null> {
  if (!isUuid(id)) return null;

  const [image] = await db
    .select({ url: images.url })
    .from(images)
    .where(eq(images.id, id))
    .limit(1);
  if (image) return image.url;

  const [attachment] = await db
    .select({ url: commentImages.url })
    .from(commentImages)
    .where(eq(commentImages.id, id))
    .limit(1);
  return attachment?.url ?? null;
}
