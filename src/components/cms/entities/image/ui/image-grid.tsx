"use client";

import { useState, useEffect } from "react";
import ImageTile from "./image-tile";

type Props = {
  images?: string[];
  onFreeze?: (msg: string | null) => void;
};

export default function ImageGrid({ images = [], onFreeze }: Props) {
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const freeze = onFreeze ?? (() => {});

  // ESC closes current tile
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedUrl(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const list = Array.isArray(images) ? images : [];

  return (
    <div
      dir="rtl"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
    >
      {list.map((url) => (
        <ImageTile
          key={url}
          url={url}
          open={selectedUrl === url}
          onToggle={() => setSelectedUrl((prev) => (prev === url ? null : url))}
          onRequestClose={() => setSelectedUrl(null)}
          onFreeze={freeze}
        />
      ))}
    </div>
  );
}
