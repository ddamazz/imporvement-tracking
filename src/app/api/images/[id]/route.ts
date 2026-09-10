import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { images } from "@/db/schema";
import { hasSession } from "@/lib/session";
import { isUuid } from "@/lib/queries";

/**
 * Streams a private blob to a signed-in viewer.
 *
 * The Blob store is private, so screenshots sit behind the same password as
 * everything else. The URL is looked up from the database by row id rather
 * than taken from the request, so this can't be pointed at an arbitrary host.
 */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/images/[id]">,
): Promise<Response> {
  if (!(await hasSession())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await ctx.params;
  if (!isUuid(id)) return new Response("Not found", { status: 404 });

  const [row] = await db
    .select({ url: images.url })
    .from(images)
    .where(eq(images.id, id))
    .limit(1);

  if (!row) return new Response("Not found", { status: 404 });

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    // Worth saying out loud: a missing token here looks exactly like a broken
    // image in the UI, which is very hard to guess at.
    console.error(
      "BLOB_READ_WRITE_TOKEN is not set, so stored screenshots cannot be read. " +
        "Connect the Blob store to this project and redeploy.",
    );
    return new Response("Image storage is not configured", { status: 503 });
  }

  const upstream = await fetch(row.url, {
    headers: { authorization: `Bearer ${token}` },
  });

  if (!upstream.ok || !upstream.body) {
    console.error(
      `Blob storage refused ${row.url} with ${upstream.status}. ` +
        "If this is 401/403 the BLOB_READ_WRITE_TOKEN belongs to a different store.",
    );
    return new Response("Image unavailable", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "image/png",
      // A row's blob never changes, so this is safe to cache hard — but only
      // in the viewer's own browser, never a shared cache.
      "cache-control": "private, max-age=31536000, immutable",
    },
  });
}
