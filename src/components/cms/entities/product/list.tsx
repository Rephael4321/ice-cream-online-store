"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/cms/ui/input";
import Link from "next/link";
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  price: string | number;
  image?: string;
  saleQuantity?: number | string;
  salePrice?: string | number;
  created_at?: string;
  updated_at?: string;
  in_stock?: boolean;
  categories?: string[];
}

export default function ListProduct() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showDuplicatesPanel, setShowDuplicatesPanel] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialSearch = params.get("q") || "";
    setSearch(initialSearch);
  }, []);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("ארעה תקלה בטעינת מוצרים");
        const data = await res.json();
        setProducts((data.products ?? data).reverse());
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  // Map: image -> count
  const duplicateImageMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      if (p.image) {
        map.set(p.image, (map.get(p.image) ?? 0) + 1);
      }
    }
    return map;
  }, [products]);

  // Extract actual duplicates
  const duplicateGroups = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    for (const p of products) {
      if (p.image && (duplicateImageMap.get(p.image) ?? 0) > 1) {
        if (!groups[p.image]) groups[p.image] = [];
        groups[p.image].push(p);
      }
    }
    return groups;
  }, [products, duplicateImageMap]);

  const hasDuplicates = Object.keys(duplicateGroups).length > 0;

  const filtered = useMemo(() => {
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toString().includes(search)
    );
  }, [products, search]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (!sortKey) return list;

    return list.sort((a, b) => {
      let aVal: any = null;
      let bVal: any = null;

      switch (sortKey) {
        case "id":
        case "price":
          aVal = Number(a[sortKey]);
          bVal = Number(b[sortKey]);
          break;
        case "name":
          aVal = a.name?.toLowerCase() ?? "";
          bVal = b.name?.toLowerCase() ?? "";
          break;
        case "sale":
          aVal = Number(a.saleQuantity ?? 0) * Number(a.salePrice ?? 0);
          bVal = Number(b.saleQuantity ?? 0) * Number(b.salePrice ?? 0);
          break;
        case "created_at":
        case "updated_at":
          aVal = new Date(a[sortKey] ?? "").getTime();
          bVal = new Date(b[sortKey] ?? "").getTime();
          break;
        case "in_stock":
          aVal = a.in_stock ? 1 : 0;
          bVal = b.in_stock ? 1 : 0;
          break;
        case "categories":
          aVal = (a.categories?.[0] || "").toLowerCase();
          bVal = (b.categories?.[0] || "").toLowerCase();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortAsc]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    const params = new URLSearchParams(window.location.search);
    if (newValue) {
      params.set("q", newValue);
    } else {
      params.delete("q");
    }
    router.replace(`?${params.toString()}`);
  };

  if (loading) return <p className="p-4">טוען מוצרים...</p>;
  if (error) return <p className="p-4 text-red-500">שגיאה: {error}</p>;

  return (
    <div className="p-6 space-y-6">
      {/* Duplicate warning message */}
      {hasDuplicates && (
        <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-md shadow flex justify-between items-center">
          <span>⚠️ נמצאו תמונות כפולות — יש מוצרים שמשתמשים באותה תמונה.</span>
          <button
            onClick={() => setShowDuplicatesPanel((s) => !s)}
            className="text-sm px-3 py-1 bg-yellow-200 rounded hover:bg-yellow-300"
          >
            {showDuplicatesPanel ? "סגור רשימת כפולים" : "הצג כפולים"}
          </button>
        </div>
      )}

      {/* Duplicates panel */}
      {showDuplicatesPanel && (
        <div className="bg-white border rounded-md shadow p-4 space-y-6">
          <h2 className="text-lg font-bold mb-2">מוצרים עם תמונות כפולות</h2>
          {Object.entries(duplicateGroups).map(([image, group]) => (
            <div key={image} className="border rounded p-3 space-y-2">
              <div className="flex items-center gap-3">
                <Image
                  src={image}
                  alt="Duplicate"
                  width={60}
                  height={60}
                  className="rounded object-contain w-14 h-14"
                />
                <span className="text-gray-600">
                  {group.length} מוצרים משתמשים בתמונה זו
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.map((p) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.id}`}
                    className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm"
                  >
                    #{p.id} {p.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">רשימת מוצרים</h1>

        <div className="flex items-center gap-4">
          <Input
            type="text"
            placeholder="חפש מוצר לפי שם או מספר..."
            value={search}
            onChange={handleSearchChange}
            className="max-w-sm"
          />
        </div>
      </div>

      {/* Products grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {sorted.map((product) => {
          const isDuplicate =
            !!product.image && (duplicateImageMap.get(product.image) ?? 0) > 1;

          return (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="border p-4 rounded-xl shadow-md bg-white flex flex-col items-center transition hover:shadow-xl hover:scale-[1.02] relative"
            >
              {product.image && (
                <Image
                  src={product.image}
                  alt={product.name}
                  width={120}
                  height={120}
                  className="rounded-xl object-contain w-24 h-24"
                />
              )}
              <div className="text-xs text-gray-400 text-center">
                ID: {product.id}
              </div>
              <div className="mt-1 font-bold text-center">{product.name}</div>
              <div className="text-gray-700 text-sm text-center">
                ₪{Number(product.price).toFixed(2)}
              </div>
              {product.salePrice && product.saleQuantity && (
                <div className="text-green-600 text-sm text-center">
                  מבצע: {product.saleQuantity} ב־ ₪
                  {Number(product.salePrice).toFixed(2)}
                </div>
              )}
              {product.in_stock === false && (
                <div className="text-red-600 text-xs mt-1">אזל מהמלאי</div>
              )}
              {isDuplicate && (
                <div className="absolute top-2 right-2 text-xs px-2 py-1 bg-red-600 text-white rounded-full shadow font-bold">
                  ⚠️ תמונה בשימוש כפול
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
