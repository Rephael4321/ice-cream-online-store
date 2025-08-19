import { Fragment, useMemo } from "react";
import { ProductImage } from "../list";
import ImageCard from "./image-card";

type GroupBy = "name" | "updated" | "size";

export default function ImageGrid({
  images,
  groupBy = "updated",
  order = "desc",
}: {
  images: ProductImage[];
  groupBy?: GroupBy;
  order?: "asc" | "desc";
}) {
  const groups = useMemo(
    () => groupAndSortImages(images, groupBy, order),
    [images, groupBy, order]
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {groups.map(({ label, items }) => (
        <Fragment key={label}>
          {/* Divider */}
          <div className="col-span-full">
            <div className="flex items-center gap-3 my-2">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-500">{label}</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
          </div>

          {/* Cards (sorted within group) */}
          {items.map((img) => (
            <ImageCard key={img.key} image={img} />
          ))}
        </Fragment>
      ))}
    </div>
  );
}

/* ---------- helpers ---------- */

function displayNameOf(img: ProductImage) {
  // Supports optional API-provided `name`, falls back to filename
  // @ts-ignore — allow name if your type didn't include it yet
  const name: string | undefined = (img as any).name;
  return name ?? img.key.split("/").pop() ?? img.key;
}

function groupAndSortImages(
  images: ProductImage[],
  by: GroupBy,
  order: "asc" | "desc"
) {
  // Prepare normalized fields used for sorting
  const enriched = images.map((img) => ({
    ...img,
    __display: displayNameOf(img).toLowerCase(),
    __updatedMs: img.updated_at
      ? new Date(img.updated_at).getTime()
      : -Infinity,
    __bucket: by === "size" ? sizeBucket(img.size) : undefined,
  }));

  // Group
  const map = new Map<string, ProductImage[]>();
  const groupKeyOrder: Array<{ key: string; sortKey: number | string }> = [];

  const upsertGroup = (key: string, sortKey: number | string) => {
    if (!map.has(key)) {
      map.set(key, []);
      groupKeyOrder.push({ key, sortKey });
    }
  };

  if (by === "updated") {
    // group by local calendar day; sort groups by date
    for (const img of enriched) {
      const d = img.__updatedMs;
      const label =
        d > 0 ? new Date(d).toLocaleDateString("he-IL") : "ללא תאריך";
      const dayStart = d > 0 ? startOfDayLocal(d) : -Infinity;
      upsertGroup(label, dayStart);
      map.get(label)!.push(img);
    }
    // sort groups by dayStart
    groupKeyOrder.sort((a, b) =>
      a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0
    );
  } else if (by === "name") {
    // group by first letter; sort groups A→Z
    for (const img of enriched) {
      const first = img.__display.charAt(0).toUpperCase() || "#";
      upsertGroup(first, first);
      map.get(first)!.push(img);
    }
    groupKeyOrder.sort((a, b) =>
      (a.sortKey as string).localeCompare(b.sortKey as string, "he")
    );
  } else {
    // by === "size" — group into size buckets; use a fixed logical order
    for (const img of enriched) {
      const b = img.__bucket!;
      upsertGroup(b.label, b.rank);
      map.get(b.label)!.push(img);
    }
    groupKeyOrder.sort((a, b) => (a.sortKey as number) - (b.sortKey as number));
  }

  // Apply order to groups (asc keeps natural order, desc reverses)
  if (order === "desc") groupKeyOrder.reverse();

  // Sort items within each group by the same key (then tiebreak by name, then key)
  const compare = (a: any, b: any) => {
    let cmp = 0;
    if (by === "updated") {
      cmp = (a.__updatedMs as number) - (b.__updatedMs as number);
    } else if (by === "name") {
      cmp = a.__display.localeCompare(b.__display, "he");
    } else {
      // size
      cmp = (a.size as number) - (b.size as number);
    }
    if (cmp === 0) {
      cmp = a.__display.localeCompare(b.__display, "he");
      if (cmp === 0) cmp = a.key.localeCompare(b.key, "he");
    }
    return order === "asc" ? cmp : -cmp;
  };

  return groupKeyOrder.map(({ key: label }) => {
    const items = (map.get(label)! as any[]).slice().sort(compare);
    return { label, items };
  });
}

function startOfDayLocal(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function sizeBucket(bytes: number) {
  const KB = 1024,
    MB = KB * 1024;
  if (bytes < 100 * KB) return { label: "0–100 KB", rank: 0 };
  if (bytes < 500 * KB) return { label: "100–500 KB", rank: 1 };
  if (bytes < 1 * MB) return { label: "0.5–1 MB", rank: 2 };
  if (bytes < 5 * MB) return { label: "1–5 MB", rank: 3 };
  return { label: "5+ MB", rank: 4 };
}
