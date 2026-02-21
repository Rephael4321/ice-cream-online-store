"use client";

import { useState, useEffect } from "react";
import ImageTile from "./image-tile";

export type ImageItem = { url: string; key: string; name: string };

type Props = {
  images?: ImageItem[];
  onFreeze?: (msg: string | null) => void;
  selectMode?: boolean;
  selected?: Set<string>; // URLs
  onToggleSelect?: (url: string) => void;
  onEnterSelectMode?: () => void;
};

export default function ImageLibraryGrid({
  images = [],
  onFreeze,
  selectMode = false,
  selected,
  onToggleSelect,
  onEnterSelectMode,
}: Props) {
  const [openUrl, setOpenUrl] = useState<string | null>(null);
  const freeze = onFreeze ?? (() => {});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenUrl(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      dir="rtl"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
    >
      {images.map((img) => (
        <ImageTile
          key={img.url}
          item={img}
          open={openUrl === img.url}
          onToggle={() =>
            setOpenUrl((prev) => (prev === img.url ? null : img.url))
          }
          onRequestClose={() => setOpenUrl(null)}
          onFreeze={freeze}
          selectMode={selectMode}
          selected={selected?.has(img.url) ?? false}
          onToggleSelect={() => onToggleSelect?.(img.url)}
          onEnterSelectMode={() => {
            onEnterSelectMode?.();
            onToggleSelect?.(img.url);
          }}
        />
      ))}
    </div>
  );
}
