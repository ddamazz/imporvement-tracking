import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { hasSession } from "@/lib/session";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

/**
 * Signs client-side uploads. Screenshots routinely exceed the 4.5 MB request
 * body limit, so the browser uploads straight to Blob storage and only the
 * short-lived token comes from here.
 *
 * This route is excluded from the proxy so Blob's `upload-completed` callback
 * (which arrives without our cookie, and is signature-verified by
 * `handleUpload`) can reach it. Token issuance still checks the session.
 */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;

  // Checked before `handleUpload` so an unauthenticated caller always gets a
  // 401, regardless of how the Blob store is configured. The
  // `upload-completed` callback arrives without our cookie and is
  // signature-verified by `handleUpload` instead.
  if (
    body.type === "blob.generate-client-token" &&
    !(await hasSession())
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: [
            "image/png",
            "image/jpeg",
            "image/gif",
            "image/webp",
            "image/avif",
          ],
          maximumSizeInBytes: MAX_IMAGE_BYTES,
          addRandomSuffix: true,
        };
      },
      // The database row is written by the `saveIssue` action instead: this
      // callback cannot reach localhost, so relying on it would break dev.
      onUploadCompleted: async () => {},
    });

    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
