import { put } from "@vercel/blob";
import { assertSession } from "@/lib/session";
import { isUuid } from "@/lib/queries";

/** Comfortably under Vercel's 4.5 MB request-body limit. */
const MAX_BYTES = 4 * 1024 * 1024;

const ACCEPTED = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
]);

/**
 * Receives one image and stores it in Blob.
 *
 * The browser used to upload straight to Blob with `upload()`, but that path
 * is blocked by CORS (the SDK PUTs to vercel.com, which sends no
 * Access-Control-Allow-Origin header). Going through the server also means one
 * session check covers it. The client shrinks large screenshots first so the
 * request stays inside Vercel's body limit.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    await assertSession();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const pageId = String(form.get("pageId") ?? "");

  if (!(file instanceof File)) {
    return Response.json({ error: "No file was sent." }, { status: 400 });
  }
  if (!ACCEPTED.has(file.type)) {
    return Response.json(
      { error: `${file.type || "That file"} is not a supported image.` },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: "That image is too large even after resizing." },
      { status: 413 },
    );
  }
  if (!isUuid(pageId)) {
    return Response.json({ error: "Invalid page." }, { status: 400 });
  }

  // The store is private, so blobs are only readable through /api/images/[id].
  const blob = await put(`audits/${pageId}/${file.name || "screenshot"}`, file, {
    access: "private",
    addRandomSuffix: true,
    contentType: file.type,
  });

  return Response.json({ url: blob.url, pathname: blob.pathname });
}
