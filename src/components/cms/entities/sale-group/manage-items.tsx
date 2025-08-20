// components/cms/entities/sale-group/manage-items.tsx
"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/cms/ui/input";
import ProductRow from "./ui/product-row";

type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
  sale: { quantity: number; sale_price: number } | null;
  alreadyLinked: boolean; // label/color removed from UI
};

type SaleGroupInfo = {
  quantity: number | null;
  sale_price: number | null;
  price: number | null;
};

type Grouped = {
  label: string;
  items: Product[];
  hasLinked: boolean;
  sortKey: number;
  // stats for visibility of differences
  unitPrices: number[];
  uniqueUnitPrices: number[];
  minUnitPrice: number | null;
  maxUnitPrice: number | null;
  hasVariance: boolean;
};

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
          sortKey: priceFromLabel(label), // used to sort sections
          unitPrices: [],
          uniqueUnitPrices: [],
          minUnitPrice: null,
          maxUnitPrice: null,
          hasVariance: false,
        };
      }
      groups[label].items.push(product);
      groups[label].unitPrices.push(Number(product.price));
      if (product.alreadyLinked) groups[label].hasLinked = true;
    }

    // compute stats for visibility
    for (const g of Object.values(groups)) {
      const rounded = g.unitPrices.map((v) => Number(v.toFixed(2)));
      const uniq = Array.from(new Set(rounded));
      g.uniqueUnitPrices = uniq.sort((a, b) => b - a); // show high->low pills
      if (uniq.length > 0) {
        g.minUnitPrice = Math.min(...uniq);
        g.maxUnitPrice = Math.max(...uniq);
      } else {
        g.minUnitPrice = null;
        g.maxUnitPrice = null;
      }
      g.hasVariance = (g.minUnitPrice ?? 0) !== (g.maxUnitPrice ?? 0);
      // sort items inside the section: alreadyLinked first, then unit price desc, then id asc
      g.items.sort((a, b) => {
        if (a.alreadyLinked !== b.alreadyLinked)
          return a.alreadyLinked ? -1 : 1;
        if (a.price !== b.price) return b.price - a.price; // DESC by price
        return a.id - b.id;
      });
    }

    // Sections: 1) hasLinked first, 2) by sortKey DESC
    return Object.values(groups).sort((a, b) => {
      if (a.hasLinked !== b.hasLinked) return a.hasLinked ? -1 : 1;
      return b.sortKey - a.sortKey; // DESC
    });
  }, [filtered]);

  // Smooth scroll to top when a linked section first appears,
  // and back to the previous position when it disappears.
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

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">ניהול קבוצת מבצע #{saleGroupId}</h1>

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
          return (
            <div
              key={group.label}
              className={`space-y-2 rounded-md p-2 bg-white shadow-sm ${ringClass}`}
              title={
                group.hasLinked
                  ? "מכיל מוצרים שכבר בקבוצה"
                  : group.hasVariance
                  ? "מחירי יחידה שונים בתוך קבוצה זו"
                  : undefined
              }
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-lg font-semibold text-blue-600">
                  {group.label} {group.hasLinked ? "• כבר בקבוצה" : ""}
                </div>

                <div className="text-sm text-gray-700 flex items-center flex-wrap gap-2">
                  {group.hasVariance ? (
                    <span className="font-semibold text-red-700">
                      ⚠️ הבדל מחירים בקבוצה: ₪{group.minUnitPrice?.toFixed(2)}–₪
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
              </div>

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
                    group.minUnitPrice !== null && group.maxUnitPrice !== null
                      ? {
                          min: group.minUnitPrice,
                          max: group.maxUnitPrice,
                          uniqueCount: group.uniqueUnitPrices.length,
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
