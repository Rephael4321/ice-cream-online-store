// components/cms/entities/sale-group/manage-items.tsx
"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/cms/ui/input";
import { Button } from "@/components/cms/ui/button";
import { showToast } from "@/components/cms/ui/toast";
import ProductRow from "./ui/product-row";

type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
  sale: { quantity: number; sale_price: number } | null;
  alreadyLinked: boolean;
};

type SaleGroupInfo = {
  quantity: number | null;
  sale_price: number | null;
  price: number | null;
};

type Variant = {
  key: string;
  price: number;
  sale_price: number | null;
  quantity: number | null;
  count: number;
};

type Grouped = {
  label: string;
  items: Product[];
  hasLinked: boolean;
  sortKey: number;

  unitPrices: number[];
  uniqueUnitPrices: number[];
  minUnitPrice: number | null;
  maxUnitPrice: number | null;
  hasVariance: boolean;

  variants: Variant[];
};

function round2(n: number | null | undefined): number | null {
  if (n == null) return null;
  return Math.round(n * 100) / 100;
}

function makeVariantKey(p: Product) {
  const price = round2(p.price);
  const sp = p.sale ? round2(p.sale.sale_price) : null;
  const q = p.sale ? p.sale.quantity : null;
  return `${price}|${sp ?? "null"}|${q ?? "null"}`;
}

function variantMatchesProduct(v: Variant, p: Product) {
  const pPrice = round2(p.price);
  const pSalePrice = p.sale ? round2(p.sale.sale_price) : null;
  const pQty = p.sale ? p.sale.quantity : null;
  return (
    pPrice === v.price && pSalePrice === v.sale_price && pQty === v.quantity
  );
}

function baseMatchesVariant(base: SaleGroupInfo, v: Variant) {
  return (
    round2(base.price as number) === v.price &&
    round2(base.sale_price as number | null) === v.sale_price &&
    (base.quantity as number | null) === v.quantity
  );
}

function formatVariant(v: Variant) {
  const unit = `₪${v.price.toFixed(2)}`;
  if (v.sale_price != null && v.quantity != null) {
    return `${unit} · מבצע: ₪${v.sale_price.toFixed(2)} × ${v.quantity}`;
  }
  return `${unit} · ללא מבצע`;
}

export default function ManageSaleGroupItems() {
  const { id } = useParams();
  const saleGroupId = Array.isArray(id) ? id[0] : id;

  const [products, setProducts] = useState<Product[]>([]);
  const [groupSaleInfo, setGroupSaleInfo] = useState<SaleGroupInfo>({
    quantity: null,
    sale_price: null,
    price: null,
  });
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Bulk UI state (toggle + dropdown)
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [busyFor, setBusyFor] = useState<string | null>(null); // section label being processed
  const [clearBusy, setClearBusy] = useState(false); // global clear

  // Collapsed sections (default: all collapsed)
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Scroll state refs
  const hadLinkedRef = useRef<boolean | null>(null);
  const savedScrollYRef = useRef<number>(0);

  async function fetchProducts() {
    setLoading(true);
    try {
      const [productsRes, groupRes] = await Promise.all([
        fetch(`/api/sale-groups/${saleGroupId}/items/eligible-products`),
        fetch(`/api/sale-groups/${saleGroupId}`),
      ]);

      if (!productsRes.ok || !groupRes.ok) {
        setProducts([]);
        setGroupSaleInfo({ quantity: null, sale_price: null, price: null });
      } else {
        const productsData = await productsRes.json();
        const groupData = await groupRes.json();

        setProducts(productsData);
        setGroupSaleInfo({
          quantity: groupData.quantity,
          sale_price: groupData.sale_price,
          price: groupData.price,
        });
      }
    } catch {
      setProducts([]);
      setGroupSaleInfo({ quantity: null, sale_price: null, price: null });
    } finally {
      setHasLoaded(true);
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!saleGroupId) return;
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleGroupId]);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.id.toString().includes(query)
      ),
    [products, query]
  );

  const orderedGroups = useMemo<Grouped[]>(() => {
    const groups: Record<string, Grouped> = {};
    const priceFromLabel = (label: string) =>
      parseFloat(label.replace(/[^\d.]/g, "")) || 0;

    for (const product of filtered) {
      const label = product.sale
        ? `מבצע: ₪${Number(product.sale.sale_price).toFixed(2)} × ${
            product.sale.quantity
          }`
        : `₪${Number(product.price).toFixed(2)}`;

      if (!groups[label]) {
        groups[label] = {
          label,
          items: [],
          hasLinked: false,
          sortKey: priceFromLabel(label),
          unitPrices: [],
          uniqueUnitPrices: [],
          minUnitPrice: null,
          maxUnitPrice: null,
          hasVariance: false,
          variants: [],
        };
      }
      groups[label].items.push(product);
      groups[label].unitPrices.push(Number(product.price));
      if (product.alreadyLinked) groups[label].hasLinked = true;
    }

    // compute stats + variants
    for (const g of Object.values(groups)) {
      const rounded = g.unitPrices.map((v) => Number(round2(v)));
      const uniq = Array.from(new Set(rounded));
      g.uniqueUnitPrices = uniq.sort((a, b) => b - a);
      g.minUnitPrice = uniq.length ? Math.min(...uniq) : null;
      g.maxUnitPrice = uniq.length ? Math.max(...uniq) : null;
      g.hasVariance = (g.minUnitPrice ?? 0) !== (g.maxUnitPrice ?? 0);

      const map = new Map<string, Variant>();
      for (const p of g.items) {
        const key = makeVariantKey(p);
        if (!map.has(key)) {
          map.set(key, {
            key,
            price: round2(p.price)!,
            sale_price: p.sale ? round2(p.sale.sale_price) : null,
            quantity: p.sale ? p.sale.quantity : null,
            count: 0,
          });
        }
        map.get(key)!.count += 1;
      }
      g.variants = Array.from(map.values()).sort((a, b) => {
        if (a.price !== b.price) return b.price - a.price;
        return b.count - a.count;
      });

      // sort items in section: linked first, then unit price DESC, then id asc
      g.items.sort((a, b) => {
        if (a.alreadyLinked !== b.alreadyLinked)
          return a.alreadyLinked ? -1 : 1;
        if (a.price !== b.price) return b.price - a.price;
        return a.id - b.id;
      });
    }

    // sections: hasLinked first, then price DESC
    return Object.values(groups).sort((a, b) => {
      if (a.hasLinked !== b.hasLinked) return a.hasLinked ? -1 : 1;
      return b.sortKey - a.sortKey;
    });
  }, [filtered]);

  // Smooth scroll when linked section appears/disappears
  useEffect(() => {
    const hasLinkedNow = orderedGroups.some((g) => g.hasLinked);
    const hadLinkedBefore = hadLinkedRef.current;

    if (hadLinkedBefore === null) {
      hadLinkedRef.current = hasLinkedNow;
      return;
    }

    if (!hadLinkedBefore && hasLinkedNow) {
      savedScrollYRef.current = window.scrollY;
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    if (hadLinkedBefore && !hasLinkedNow) {
      const y = Math.max(0, savedScrollYRef.current || 0);
      requestAnimationFrame(() => {
        window.scrollTo({ top: y, behavior: "smooth" });
      });
    }

    hadLinkedRef.current = hasLinkedNow;
  }, [orderedGroups]);

  // ---------- Bulk helpers ----------
  async function bulkAddVariant(group: Grouped, variant: Variant) {
    setBusyFor(group.label);
    try {
      const toAdd = group.items.filter(
        (p) => !p.alreadyLinked && variantMatchesProduct(variant, p)
      );

      if (toAdd.length === 0) {
        showToast("אין פריטים תואמים להוספה בקבוצה זו", "info");
        return;
      }

      let ok = 0;
      let fail = 0;
      for (const p of toAdd) {
        try {
          const res = await fetch(
            `/api/sale-groups/${saleGroupId}/items/${p.id}`,
            { method: "POST" }
          );
          if (res.ok) ok++;
          else fail++;
        } catch {
          fail++;
        }
      }

      if (ok > 0) showToast(`✔️ נוספו ${ok} פריטים`, "success");
      if (fail > 0) showToast(`⚠️ ${fail} פריטים נדחו`, "warning");
      await fetchProducts();
    } finally {
      setBusyFor(null);
      setMenuOpenFor(null);
    }
  }

  async function bulkRemoveSection(group: Grouped) {
    const linked = group.items.filter((p) => p.alreadyLinked);
    if (linked.length === 0) {
      showToast("אין פריטים מקושרים בקבוצה זו להסרה", "info");
      return;
    }
    if (!confirm(`להסיר ${linked.length} פריטים מקושרים מהמקטע?`)) return;

    setBusyFor(group.label);
    try {
      let ok = 0;
      let fail = 0;
      for (const p of linked) {
        try {
          const res = await fetch(
            `/api/sale-groups/${saleGroupId}/items/${p.id}`,
            { method: "DELETE" }
          );
          if (res.ok) ok++;
          else fail++;
        } catch {
          fail++;
        }
      }
      if (ok > 0) showToast(`🗑️ הוסרו ${ok} פריטים`, "success");
      if (fail > 0) showToast(`⚠️ ${fail} פריטים לא הוסרו`, "warning");
      await fetchProducts();
    } finally {
      setBusyFor(null);
    }
  }

  async function clearAllLinkedInGroup() {
    const allLinked = products.filter((p) => p.alreadyLinked);
    if (allLinked.length === 0) {
      showToast("אין פריטים מקושרים להסרה", "info");
      return;
    }
    if (!confirm(`להסיר את כל ${allLinked.length} הפריטים המקושרים מהקבוצה?`))
      return;

    setClearBusy(true);
    try {
      let ok = 0;
      let fail = 0;
      for (const p of allLinked) {
        try {
          const res = await fetch(
            `/api/sale-groups/${saleGroupId}/items/${p.id}`,
            { method: "DELETE" }
          );
          if (res.ok) ok++;
          else fail++;
        } catch {
          fail++;
        }
      }
      if (ok > 0) showToast(`🗑️ הוסרו ${ok} פריטים`, "success");
      if (fail > 0) showToast(`⚠️ ${fail} פריטים לא הוסרו`, "warning");
      await fetchProducts();
    } finally {
      setClearBusy(false);
    }
  }

  // ---------- Toggle logic per section ----------
  function computeToggleState(group: Grouped) {
    const groupHasBase =
      groupSaleInfo.price != null &&
      groupSaleInfo.sale_price != null &&
      groupSaleInfo.quantity != null;

    const notLinked = group.items.filter((p) => !p.alreadyLinked);
    const linked = group.items.filter((p) => p.alreadyLinked);

    const baseMatch =
      groupHasBase &&
      group.variants.find((v) => baseMatchesVariant(groupSaleInfo, v));

    const requiresChoice =
      !groupHasBase && group.variants.length > 1 && notLinked.length > 0;

    let addables: Product[] = [];
    if (groupHasBase && baseMatch) {
      addables = notLinked.filter((p) =>
        variantMatchesProduct(baseMatch as Variant, p)
      );
    } else if (!groupHasBase && group.variants.length === 1) {
      const v = group.variants[0];
      addables = notLinked.filter((p) => variantMatchesProduct(v, p));
    } else if (requiresChoice) {
      addables = [];
    }

    type Mode = "add" | "remove" | "disabled";
    let mode: Mode = "disabled";

    if (addables.length > 0 || requiresChoice) {
      mode = "add";
    } else if (linked.length > 0) {
      mode = "remove";
    } else {
      mode = "disabled";
    }

    return {
      mode,
      addablesCount: addables.length,
      linkedCount: linked.length,
      requiresChoice,
      baseMatch: baseMatch || null,
    };
  }

  function handlePrimaryToggle(group: Grouped) {
    const st = computeToggleState(group);

    if (st.mode === "add") {
      if (st.requiresChoice) {
        setMenuOpenFor((cur) => (cur === group.label ? null : group.label));
        return;
      }
      const variant =
        (st.baseMatch as Variant | null) ?? group.variants[0] ?? null;
      if (!variant) {
        showToast("לא נמצאה וריאציה מתאימה להוספה", "error");
        return;
      }
      return bulkAddVariant(group, variant);
    }

    if (st.mode === "remove") {
      return bulkRemoveSection(group);
    }
  }

  // Collapsible helpers
  function isOpen(label: string) {
    return expanded.has(label);
  }
  function toggleOpen(label: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold">ניהול קבוצת מבצע #{saleGroupId}</h1>

        <Button
          variant="destructive"
          onClick={clearAllLinkedInGroup}
          disabled={clearBusy || loading}
          title="הסר את כל הפריטים המקושרים בקבוצה"
        >
          {clearBusy ? "מסיר…" : "נקה קבוצה"}
        </Button>
      </div>

      {groupSaleInfo.price !== null && (
        <div className="text-sm text-gray-700 border p-2 rounded-md bg-white shadow-sm">
          <p>
            מחיר יחידה: <strong>₪{groupSaleInfo.price}</strong>
          </p>
          {groupSaleInfo.quantity !== null &&
            groupSaleInfo.sale_price !== null && (
              <p>
                מבצע: <strong>₪{groupSaleInfo.sale_price}</strong> עבור{" "}
                <strong>{groupSaleInfo.quantity}</strong> יחידות
              </p>
            )}
        </div>
      )}

      <Input
        placeholder="חיפוש לפי שם או מזהה"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {!hasLoaded ? (
        <p className="text-muted animate-pulse">טוען מוצרים…</p>
      ) : orderedGroups.length === 0 ? (
        <p className="text-muted">לא נמצאו מוצרים</p>
      ) : (
        orderedGroups.map((group) => {
          const ringClass = group.hasLinked
            ? "ring-1 ring-amber-300"
            : group.hasVariance
            ? "ring-1 ring-red-300"
            : "ring-1 ring-slate-200";

          const st = computeToggleState(group);
          const isBusy = busyFor === group.label;
          const open = isOpen(group.label);

          const primaryLabel =
            st.mode === "add"
              ? isBusy
                ? "מוסיף…"
                : "הוסף את כולם"
              : st.mode === "remove"
              ? isBusy
                ? "מסיר…"
                : "הסר מקושרים"
              : "לא זמין";

          const primaryVariant =
            st.mode === "remove"
              ? ("destructive" as const)
              : ("default" as const);

          const primaryDisabled =
            isBusy ||
            st.mode === "disabled" ||
            (st.mode === "add" && !st.requiresChoice && st.addablesCount === 0);

          return (
            <div
              key={group.label}
              className={`relative space-y-2 rounded-md p-2 bg-white shadow-sm ${ringClass}`}
            >
              {/* Header row (always visible) */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    className="text-sm px-2 py-1 rounded border bg-gray-50 hover:bg-gray-100"
                    onClick={() => toggleOpen(group.label)}
                    title={open ? "סגור" : "פתח"}
                  >
                    {open ? "▾" : "▸"}
                  </button>

                  <div className="text-lg font-semibold text-blue-600">
                    {group.label} {group.hasLinked ? "• כבר בקבוצה" : ""}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="text-sm text-gray-700 flex items-center flex-wrap gap-2">
                    {group.hasVariance ? (
                      <span className="font-semibold text-red-700">
                        ⚠️ הבדל מחירים בקבוצה: ₪{group.minUnitPrice?.toFixed(2)}
                        –₪
                        {group.maxUnitPrice?.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-gray-600">
                        מחיר אחיד בקבוצה: ₪{group.maxUnitPrice?.toFixed(2)}
                      </span>
                    )}
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-600">
                      {group.items.length} פריטים
                    </span>
                  </div>

                  {/* Primary TOGGLE + optional dropdown (visible even when collapsed) */}
                  <div className="relative">
                    <div className="flex gap-1">
                      <Button
                        variant={primaryVariant}
                        onClick={() => handlePrimaryToggle(group)}
                        disabled={primaryDisabled}
                        title={
                          st.mode === "add"
                            ? st.requiresChoice
                              ? "קיימות וריאציות שונות — לחץ לבחירה"
                              : "הוסף את כל הפריטים התואמים"
                            : st.mode === "remove"
                            ? "הסר את כל הפריטים המקושרים במקטע זה"
                            : "אין פעולות זמינות"
                        }
                      >
                        {primaryLabel}
                      </Button>

                      <Button
                        variant="secondary"
                        onClick={() =>
                          setMenuOpenFor((cur) =>
                            cur === group.label ? null : group.label
                          )
                        }
                        disabled={
                          isBusy ||
                          !(
                            (!groupSaleInfo.price &&
                              group.variants.length > 1) ||
                            (groupSaleInfo.price != null &&
                              group.variants.length > 0)
                          )
                        }
                        aria-haspopup="menu"
                        aria-expanded={menuOpenFor === group.label}
                        title="בחר לפי מחיר/מבצע"
                      >
                        ▾
                      </Button>
                    </div>

                    {menuOpenFor === group.label && (
                      <div className="absolute right-0 z-10 mt-2 w-80 rounded-md border bg-white shadow-lg">
                        <div className="px-3 py-2 text-xs text-gray-600 border-b">
                          בחר וריאציה להוספה (לפי מחיר/מבצע)
                        </div>
                        <ul className="max-h-72 overflow-auto py-1">
                          {group.variants.map((v) => {
                            const matchesBase =
                              groupSaleInfo.price != null
                                ? baseMatchesVariant(groupSaleInfo, v)
                                : true;
                            const disabled =
                              isBusy ||
                              (groupSaleInfo.price != null && !matchesBase);
                            const tooltip =
                              groupSaleInfo.price != null && !matchesBase
                                ? "לא תואם למחיר/מבצע שהוגדרו לקבוצה"
                                : undefined;
                            return (
                              <li key={v.key}>
                                <button
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                                    disabled
                                      ? "opacity-50 cursor-not-allowed"
                                      : ""
                                  }`}
                                  onClick={() =>
                                    !disabled && bulkAddVariant(group, v)
                                  }
                                  title={tooltip}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="font-medium">
                                      {formatVariant(v)}
                                    </span>
                                    <span className="text-gray-500">
                                      {v.count} פריטים
                                    </span>
                                  </div>
                                  {groupSaleInfo.price != null &&
                                    matchesBase && (
                                      <div className="text-xs text-green-700">
                                        תואם את בסיס הקבוצה
                                      </div>
                                    )}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Body (items, extra pills) — rendered only when expanded */}
              {open && (
                <>
                  {group.hasVariance && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {group.uniqueUnitPrices.map((p) => (
                        <span
                          key={p}
                          className="text-xs px-2 py-1 rounded-full border bg-gray-50"
                        >
                          ₪{p.toFixed(2)}
                        </span>
                      ))}
                    </div>
                  )}

                  {group.items.map((p) => (
                    <ProductRow
                      key={p.id}
                      saleGroupId={Number(saleGroupId)}
                      product={p}
                      onChange={fetchProducts}
                      groupSaleInfo={groupSaleInfo}
                      groupStats={
                        group.minUnitPrice !== null &&
                        group.maxUnitPrice !== null
                          ? {
                              min: group.minUnitPrice,
                              max: group.maxUnitPrice,
                              uniqueCount: group.uniqueUnitPrices.length,
                            }
                          : undefined
                      }
                    />
                  ))}
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
