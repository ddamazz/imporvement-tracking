export type StagedImage = {
  /** The private Blob URL, stored in the database. */
  url: string;
  pathname: string;
  /** What the browser actually renders: an object URL, or /api/images/<id>. */
  previewUrl: string;
};

/** Saved images are served through the authenticated proxy, never directly. */
export function imageSrc(id: string): string {
  return `/api/images/${id}`;
}

/** Keeps requests inside Vercel's 4.5 MB body limit with room to spare. */
const TARGET_BYTES = 3.5 * 1024 * 1024;
const MAX_EDGE = 2400;

/**
 * Screenshots straight from a display can be 8 MB or more, which the upload
 * route would reject. Shrink only when needed, so ordinary screenshots keep
 * their original crispness.
 */
export async function prepareForUpload(file: File): Promise<File> {
  if (file.size <= TARGET_BYTES) return file;
  if (file.type === "image/gif") return file; // Re-encoding would drop animation.

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // Let the server decide if it's usable.
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // WebP holds up well on screenshot text; drop quality only if still too big.
  for (const quality of [0.92, 0.8, 0.65]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    if (!blob) break;
    if (blob.size <= TARGET_BYTES) {
      const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
      return new File([blob], name, { type: "image/webp" });
    }
  }

  return file;
}

export async function uploadImage(
  file: File,
  pageId: string,
): Promise<{ url: string; pathname: string }> {
  const prepared = await prepareForUpload(file);

  const body = new FormData();
  body.append("file", prepared);
  body.append("pageId", pageId);

  const response = await fetch("/api/images/upload", { method: "POST", body });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error ?? `Upload failed (${response.status}).`);
  }

  return (await response.json()) as { url: string; pathname: string };
}
