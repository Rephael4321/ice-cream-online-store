import { Fragment, useMemo } from "react";
import { ProductImage } from "../list";
import ImageCard from "./image-card";

type GroupBy = "name" | "updated" | "size";

export default function ProductImageGrid({
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
    <div
      dir="rtl"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
    >
      {groups.map(({ label, items }) => (
        <Fragment key={label}>
          <GroupDivider label={label} count={items.length} />

          {items.map((img) => (
            <ImageCard key={img.key} image={img} />
          ))}
        </Fragment>
      ))}
    </div>
  );
}

/* ─── Divider Component (emphasized) ─────────────────────────────────────── */

function GroupDivider({ label, count }: { label: string; count: number }) {
  return (
    <div className="col-span-full sticky top-14 sm:top-16 z-20">
      <div className="my-2">
        <div className="flex items-center gap-3">
          <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-blue-300 to-transparent" />
          <div className="px-3 py-1.5 rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-700/30 flex items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold">{label}</span>
            <span className="text-[10px] leading-none px-2 py-0.5 rounded-full bg-white/25">
              {count}
            </span>
          </div>
          <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-blue-300 to-transparent" />
        </div>
      </div>
    </div>
  );
}

/* ─── Group + Sort Helpers (unchanged logic, sorts items inside each group) ─ */

function displayNameOf(img: ProductImage) {
  // If API added `name`, prefer it; fallback to filename
  // @ts-ignore optional
  const name: string | undefined = (img as any).name;
  return name ?? img.key.split("/").pop() ?? img.key;
}

function groupAndSortImages(
  images: ProductImage[],
  by: GroupBy,
  order: "asc" | "desc"
) {
  const enriched = images.map((img) => ({
    ...img,
    __display: displayNameOf(img).toLowerCase(),
    __updatedMs: img.updated_at
      ? new Date(img.updated_at).getTime()
      : -Infinity,
    __bucket: by === "size" ? sizeBucket(img.size) : undefined,
  }));

  const map = new Map<string, ProductImage[]>();
  const groupKeyOrder: Array<{ key: string; sortKey: number | string }> = [];

  const upsertGroup = (key: string, sortKey: number | string) => {
    if (!map.has(key)) {
      map.set(key, []);
      groupKeyOrder.push({ key, sortKey });
    }
  };

  if (by === "updated") {
    for (const img of enriched) {
      const d = img.__updatedMs;
      const label =
        d > 0 ? new Date(d).toLocaleDateString("he-IL") : "ללא תאריך";
      const dayStart = d > 0 ? startOfDayLocal(d) : -Infinity;
      upsertGroup(label, dayStart);
      map.get(label)!.push(img);
    }
    groupKeyOrder.sort((a, b) =>
      a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0
    );
  } else if (by === "name") {
    for (const img of enriched) {
      const first = img.__display.charAt(0).toUpperCase() || "#";
      upsertGroup(first, first);
      map.get(first)!.push(img);
    }
    groupKeyOrder.sort((a, b) =>
      (a.sortKey as string).localeCompare(b.sortKey as string, "he")
    );
  } else {
    for (const img of enriched) {
      const b = img.__bucket!;
      upsertGroup(b.label, b.rank);
      map.get(b.label)!.push(img);
    }
    groupKeyOrder.sort((a, b) => (a.sortKey as number) - (b.sortKey as number));
  }

  if (order === "desc") groupKeyOrder.reverse();

  const compare = (a: any, b: any) => {
    let cmp = 0;
    if (by === "updated") {
      cmp = (a.__updatedMs as number) - (b.__updatedMs as number);
    } else if (by === "name") {
      cmp = a.__display.localeCompare(b.__display, "he");
    } else {
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
