"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";

/**
 * A screenshot that says so when it cannot load, instead of leaving an empty
 * box that reads as a black image.
 */
export function Screenshot({
  src,
  className = "",
  onClick,
}: {
  src: string;
  className?: string;
  onClick?: () => void;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="grid size-full place-items-center gap-1 text-muted"
        title="This screenshot could not be loaded"
      >
        <ImageOff size={14} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      onClick={onClick}
      className={className}
    />
  );
}
