import { Metadata } from "next";
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/jwt";
import SingleProduct from "@/components/store/single-product";
import SaleGroupCluster from "@/components/store/sale-group-cluster"; // NEW
import Image from "next/image";
import Link from "next/link";
import type { ReactElement } from "react";

export interface Props {
  params: { category: string };
}

interface Category {
  id: number;
  name: string;
  image?: string;
  description?: string;
}

interface CategoryRef {
  id: number;
  name: string;
}

interface Sale {
  amount: number;
  price: number;
  fromCategory?: boolean;
  category?: CategoryRef;
  fromGroup?: boolean; // NEW
  group?: { id: number; name: string | null }; // NEW
}

interface Product {
  id: number;
  name: string;
  price: number | null;
  image?: string | null;
  inStock: boolean;
  sale?: Sale | null;
  // NEW: raw sale-group info even if not the chosen sale
  saleGroup?: {
    id: number;
    name: string | null;
    amount: number | null;
    price: number | null;
  } | null;
  sortOrder?: number;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = decodeURIComponent(params.category).replace(/-/g, " ");
  return { title: `מוצרים מתוך ${name}` };
}

export default async function ProductsByCategory({ params }: Props) {
  const raw = decodeURIComponent(params.category);

  // Slug expected by API
  const slug = raw
    .trim()
    .replace(/[\s\u05BE\u2012\u2013\u2014\u2015\u2212]+/g, "-")
    .replace(/-+/g, "-");

  // For UI
  const displayName = raw.replace(/-/g, " ");

  // Admin flag (unchanged)
  const cookieStore = cookies();
  const token = (await cookieStore).get("token")?.value;
  const isAdmin = !!(token && verifyJWT(token));

  // Child categories view
  const childrenRes = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/categories/name/${slug}/children`,
    { cache: "no-store" }
  );
  if (childrenRes.ok) {
    const childrenData = await childrenRes.json();
    const children: Category[] = childrenData.children || [];
    if (children.length > 0) {
      return (
        <div className="p-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-pink-700 text-center mb-8">
            {displayName}
          </h1>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {children.map((cat) => (
              <Link
                key={cat.id}
                href={`/category-products/${cat.name
                  .replace(/\s+/g, "-")
                  .toLowerCase()}`}
                className="hover:scale-105 transition-transform duration-200 text-center"
              >
                <div className="bg-white shadow rounded-2xl p-4 flex flex-col items-center space-y-3">
                  <div className="w-[120px] h-[120px] relative rounded-md bg-gray-100">
                    <Image
                      src={cat.image || "/ice-scream.png"}
                      alt={cat.name}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100px, 120px"
                    />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    {cat.name}
                  </h2>
                  {cat.description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {cat.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      );
    }
  }

  // Products-only API
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/categories/name/${slug}/products`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    console.error(
      "❌ [ProductsByCategory] Failed to fetch products:",
      res.status,
      res.statusText
    );
    return <div className="p-4 text-red-600">שגיאה בטעינת מוצרים</div>;
  }

  const data = await res.json();
  const products: Product[] = data.products || [];

  if (products.length === 0) {
    console.warn("⚠️ [ProductsByCategory] No products found for:", slug);
    return <div className="p-4">לא נמצאו מוצרים בקטגוריה.</div>;
  }

  // ---- Build clusters for group-based sales (only when chosen sale is fromGroup) ----
  type Cluster = {
    groupId: number;
    groupName: string | null;
    amount: number;
    price: number;
    items: Product[];
    firstIndex: number; // index of first occurrence to keep order stable
  };

  const clustersById = new Map<number, Cluster>();
  products.forEach((p, idx) => {
    const chosenFromGroup = p.sale?.fromGroup === true;
    const g = chosenFromGroup ? p.sale?.group : null;
    const groupInfo = chosenFromGroup ? p.saleGroup : null; // contains amount/price
    if (!g?.id || !groupInfo?.amount || !groupInfo?.price) return;

    if (!clustersById.has(g.id)) {
      clustersById.set(g.id, {
        groupId: g.id,
        groupName: g.name ?? null,
        amount: groupInfo.amount,
        price: groupInfo.price,
        items: [],
        firstIndex: idx,
      });
    }
    clustersById.get(g.id)!.items.push(p);
  });

  // Only keep clusters with 2+ items
  const validClusters = [...clustersById.values()]
    .filter((c) => c.items.length >= 2)
    .sort((a, b) => a.firstIndex - b.firstIndex);

  // For quick skip of items that render inside clusters
  const clusteredIds = new Set<number>();
  validClusters.forEach((c) => c.items.forEach((p) => clusteredIds.add(p.id)));

  return (
    <>
      <div className="flex justify-center mt-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-pink-700">
          {displayName}
        </h1>
      </div>

      <div className="px-4 sm:px-8 py-10 space-y-8">
        {/* walk original order; when hitting the first member of a cluster, render the cluster instead */}
        {(() => {
          const content: ReactElement[] = [];
          let i = 0;
          while (i < products.length) {
            const p = products[i];
            const clusterForHere = validClusters.find(
              (c) => c.firstIndex === i
            );

            if (clusterForHere) {
              content.push(
                <SaleGroupCluster
                  key={`cluster-${clusterForHere.groupId}-${i}`}
                  title={
                    clusterForHere.groupName
                      ? `מבצע קבוצתי: ${clusterForHere.groupName}`
                      : `מבצע קבוצתי`
                  }
                  subtitle={`קחו ${
                    clusterForHere.amount
                  } ב־₪${clusterForHere.price.toFixed(2)}`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {clusterForHere.items.map((prod) => (
                      <SingleProduct
                        key={`p-${prod.id}`}
                        id={prod.id}
                        productImage={prod.image || "/ice-scream.png"}
                        productName={prod.name}
                        productPrice={prod.price ?? 0}
                        inStock={prod.inStock}
                        sale={prod.sale ?? undefined}
                        isAdmin={isAdmin}
                      />
                    ))}
                  </div>
                </SaleGroupCluster>
              );

              // skip over all products in this cluster in the outer list
              i += clusterForHere.items.length;
              continue;
            }

            // not the head of any cluster → render single (but keep same grid spacing)
            if (!clusteredIds.has(p.id)) {
              content.push(
                <div
                  key={`singlewrap-${p.id}`}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                  <SingleProduct
                    key={`p-${p.id}`}
                    id={p.id}
                    productImage={p.image || "/ice-scream.png"}
                    productName={p.name}
                    productPrice={p.price ?? 0}
                    inStock={p.inStock}
                    sale={p.sale ?? undefined}
                    isAdmin={isAdmin}
                  />
                </div>
              );
            }

            i += 1;
          }
          return content;
        })()}
      </div>
    </>
  );
}
