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

  const orderedGroups = useMemo(() => {
    const groups: Record<string, Grouped> = {};
    const priceFromLabel = (label: string) =>
      parseFloat(label.replace(/[^\d.]/g, "")) || 0;

    for (const product of filtered) {
      const label = product.sale
        ? `מבצע: ₪${product.sale.sale_price} × ${product.sale.quantity}`
        : `₪${product.price}`;
      if (!groups[label]) {
        groups[label] = {
          label,
          items: [],
          hasLinked: false,
          sortKey: priceFromLabel(label),
        };
      }
      groups[label].items.push(product);
      if (product.alreadyLinked) groups[label].hasLinked = true;
    }

    // 1) sections with a linked product first, 2) then by price ascending
    return Object.values(groups).sort((a, b) => {
      if (a.hasLinked !== b.hasLinked) return a.hasLinked ? -1 : 1;
      return a.sortKey - b.sortKey;
    });
  }, [filtered]);

  // Smooth scroll to top when a linked section first appears,
  // and back to the previous position when it disappears.
  useEffect(() => {
    const hasLinkedNow = orderedGroups.some((g) => g.hasLinked);
    const hadLinkedBefore = hadLinkedRef.current;

    // First render -> set and bail
    if (hadLinkedBefore === null) {
      hadLinkedRef.current = hasLinkedNow;
      return;
    }

    // Transition: none -> some  (save Y and go to top)
    if (!hadLinkedBefore && hasLinkedNow) {
      savedScrollYRef.current = window.scrollY;
      // ensure layout painted
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    // Transition: some -> none  (return to saved Y)
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
        orderedGroups.map((group) => (
          <div
            key={group.label}
            className={`space-y-2 ${
              group.hasLinked ? "ring-1 ring-amber-300 rounded-md p-1" : ""
            }`}
            title={group.hasLinked ? "מכיל מוצרים שכבר בקבוצה" : undefined}
          >
            <div className="text-lg font-semibold text-blue-600">
              {group.label} {group.hasLinked ? "• כבר בקבוצה" : ""}
            </div>
            {group.items.map((p) => (
              <ProductRow
                key={p.id}
                saleGroupId={Number(saleGroupId)}
                product={p}
                onChange={fetchProducts}
                groupSaleInfo={groupSaleInfo}
              />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
