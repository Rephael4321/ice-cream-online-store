"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/cms/ui/input";
import ProductRow from "./ui/product-row";

type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
  sale: { quantity: number; sale_price: number } | null;
  label?: string;
  color?: string;
  alreadyLinked: boolean;
};

type SaleGroupInfo = {
  quantity: number | null;
  sale_price: number | null;
  price: number | null;
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
  const [hasLoaded, setHasLoaded] = useState(false); // 👈 new: first-load gate

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
      setHasLoaded(true); // 👈 mark first load done
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

  function groupProducts(items: Product[]) {
    const groups: Record<string, Product[]> = {};
    for (const product of items) {
      const key = product.sale
        ? `מבצע: ₪${product.sale.sale_price} × ${product.sale.quantity}`
        : `₪${product.price}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(product);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => {
        const price = (label: string) =>
          parseFloat(label.replace(/[^\d.]/g, "")) || 0;
        return price(a) - price(b);
      })
      .map(([label, items]) => ({ label, items }));
  }

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

      {/* Show loader until first fetch finishes */}
      {!hasLoaded ? (
        <p className="text-muted animate-pulse">טוען מוצרים…</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted">לא נמצאו מוצרים</p>
      ) : (
        groupProducts(filtered).map((group) => (
          <div key={group.label} className="space-y-2">
            <div className="text-lg font-semibold text-blue-600">
              {group.label}
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
