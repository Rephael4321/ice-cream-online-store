"use client";

import { useState, useEffect } from "react";
import ImageTile from "./image-tile";

type Props = {
  images?: string[];
  onFreeze?: (msg: string | null) => void;
  selectMode?: boolean;
  selected?: Set<string>;
  onToggleSelect?: (url: string) => void;
  onEnterSelectMode?: () => void;
};

export default function ImageGrid({
  images = [],
  onFreeze,
  selectMode = false,
  selected,
  onToggleSelect,
  onEnterSelectMode,
}: Props) {
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const freeze = onFreeze ?? (() => {});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedUrl(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      dir="rtl"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
    >
      {images.map((url) => (
        <ImageTile
          key={url}
          url={url}
          open={selectedUrl === url}
          onToggle={() => setSelectedUrl((prev) => (prev === url ? null : url))}
          onRequestClose={() => setSelectedUrl(null)}
          onFreeze={freeze}
          selectMode={selectMode}
          selected={selected?.has(url) ?? false}
          onToggleSelect={() => onToggleSelect?.(url)}
          onEnterSelectMode={() => {
            onEnterSelectMode?.();
            onToggleSelect?.(url);
          }}
        />
      ))}
    </div>
  );
}
