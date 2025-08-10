"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";

type SaleInfo = {
  amount: number;
  price: number;
  fromCategory?: boolean;
  category?: { id: number; name: string };
};

type SaleGroupMeta = {
  id: number;
  quantity: number;
  salePrice: number;
  unitPrice: number | null;
};

type Product = {
  id: number;
  productImage: string;
  productName: string;
  productPrice: number;
  sale?: SaleInfo;
  saleGroup?: SaleGroupMeta | null;
  inStock?: boolean;
};

type CartItem = Product & { quantity: number };
export type { CartItem };

type CartContextType = {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
  increaseQuantity: (productId: number) => void;
  decreaseQuantity: (productId: number) => void;
  refreshStockStatus: () => void;
  refreshSaleGroups: () => Promise<void>;
  updateStockStatus: (productId: number, inStock: boolean) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

/* --------------------------------- DEBUG ---------------------------------- */

let CART_DEBUG = false;
const envFlag = (process.env.NEXT_PUBLIC_CART_DEBUG as unknown as string) || "";

function isDebugOn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const ls = window.localStorage?.getItem("cartDebug");
    return envFlag === "1" || ls === "1";
  } catch {
    return envFlag === "1";
  }
}
function dlog(...args: any[]) {
  if (CART_DEBUG) console.log("%c[Cart]", "color:#8b5cf6;", ...args);
}
function dwarn(...args: any[]) {
  if (CART_DEBUG) console.warn("%c[Cart]", "color:#f59e0b;", ...args);
}
function derror(...args: any[]) {
  if (CART_DEBUG) console.error("%c[Cart]", "color:#ef4444;", ...args);
}
function dumpItems(label: string, items: CartItem[]) {
  if (!CART_DEBUG) return;
  console.table(
    items.map((i) => ({
      id: i.id,
      name: i.productName,
      q: i.quantity,
      inStock: i.inStock,
      price: i.productPrice,
      sale: i.sale ? `${i.sale.amount} for ${i.sale.price}` : "-",
      sg_id: (i as any).saleGroup?.id ?? null,
      sg_qty: (i as any).saleGroup?.quantity ?? null,
      sg_price: (i as any).saleGroup?.salePrice ?? null,
      sg_unit: (i as any).saleGroup?.unitPrice ?? null,
    }))
  );
  dlog(label, `count=${items.length}`);
}

/* -------------------------------------------------------------------------- */

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // init debug flag once on mount
  useEffect(() => {
    CART_DEBUG = isDebugOn();
    if (CART_DEBUG) dlog("🔧 Debug logging ENABLED (set localStorage.cartDebug='0' to disable)");
  }, []);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cart");
      if (stored) {
        const parsed = JSON.parse(stored) as CartItem[];
        setCartItems(parsed);
        dlog("💾 Hydrated from localStorage", { count: parsed.length });
        dumpItems("Hydrated items", parsed);
      } else {
        dlog("💾 No cart in localStorage");
      }
    } catch (e) {
      derror("Failed to parse localStorage cart:", e);
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem("cart", JSON.stringify(cartItems));
      dlog("💽 Saved to localStorage", { count: cartItems.length });
    } catch (e) {
      derror("Failed to save cart:", e);
    }
  }, [cartItems, hydrated]);

  // ---------- Sale-group fetch helpers ----------
  async function fetchSaleGroupsFor(ids: number[]) {
    if (!ids.length) return {};
    dlog("📡 Fetch sale-groups for product IDs:", ids);
    try {
      const res = await fetch("/api/products/sale-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        dwarn("sale-groups fetch not ok:", res.status, res.statusText);
        return {};
      }
      const map: Record<
        number,
        { id: number; quantity: number; salePrice: number; unitPrice: number | null }
      > = await res.json();
      dlog("📦 sale-groups response keys:", Object.keys(map).map((k) => Number(k)));
      return map;
    } catch (e) {
      derror("❌ fetchSaleGroupsFor failed", e);
      return {};
    }
  }

  async function ensureSaleGroupMeta(productIds: number[]) {
    const missing = cartItems
      .filter((ci) => productIds.includes(ci.id) && !ci.saleGroup)
      .map((ci) => ci.id);
    if (missing.length === 0) {
      dlog("✅ No missing sale-group meta for", productIds);
      return;
    }

    dlog("🔎 Missing sale-group meta for product IDs:", missing);
    const map = await fetchSaleGroupsFor(missing);
    const keys = Object.keys(map);
    if (!keys.length) {
      dwarn("⚠️ sale-group API returned empty for:", missing);
      return;
    }

    setCartItems((prev) =>
      prev.map((ci) => (map[ci.id] ? { ...ci, saleGroup: map[ci.id] } : ci))
    );

    dlog("🧩 Enriched sale-group meta for products:", keys.map((k) => Number(k)));
    dumpItems("After SG enrich", cartItems);
  }

  async function refreshSaleGroups() {
    const ids = cartItems.filter((ci) => !ci.saleGroup).map((ci) => ci.id);
    if (ids.length === 0) {
      dlog("🔁 refreshSaleGroups: nothing to enrich");
      return;
    }
    dlog("🔁 refreshSaleGroups for IDs:", ids);
    await ensureSaleGroupMeta(ids);
  }

  // After hydration, enrich anything loaded from localStorage that lacks meta
  useEffect(() => {
    if (!hydrated || cartItems.length === 0) return;
    (async () => {
      try {
        dlog("🚀 Post-hydration: ensuring sale-group meta for missing items");
        await refreshSaleGroups();
      } catch (e) {
        derror("Post-hydration SG enrich failed:", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // ---------- Mutators ----------
  function addToCart(product: Product, quantity: number) {
    dlog("➕ addToCart()", { id: product.id, name: product.productName, quantity });
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);

      if (existing) {
        const newQuantity = existing.quantity + quantity;
        if (newQuantity <= 0) {
          dlog("🗑 Removing item via addToCart <= 0", { id: product.id });
          return prev.filter((i) => i.id !== product.id);
        }
        const next = prev.map((i) =>
          i.id === product.id
            ? {
                ...i,
                quantity: newQuantity,
                inStock: product.inStock !== undefined ? product.inStock : i.inStock,
              }
            : i
        );
        dumpItems("After addToCart (existing)", next);
        queueMicrotask(() => ensureSaleGroupMeta([product.id]));
        return next;
      }

      if (quantity > 0) {
        const next = [
          ...prev,
          {
            ...product,
            saleGroup: product.saleGroup ?? null,
            quantity,
            inStock: product.inStock ?? true,
          },
        ];
        dumpItems("After addToCart (new)", next);
        queueMicrotask(() => ensureSaleGroupMeta([product.id]));
        return next;
      }

      dwarn("addToCart called with non-positive qty for new product; ignoring");
      return prev;
    });
  }

  function removeFromCart(productId: number) {
    dlog("➖ removeFromCart()", { id: productId });
    setCartItems((prev) => prev.filter((i) => i.id !== productId));
  }

  function clearCart() {
    dlog("🧹 clearCart()", { prevCount: cartItems.length });
    setCartItems([]);
  }

  function increaseQuantity(productId: number) {
    dlog("⬆️ increaseQuantity()", { id: productId });
    setCartItems((prev) =>
      prev.map((i) => (i.id === productId ? { ...i, quantity: i.quantity + 1 } : i))
    );
    queueMicrotask(() => ensureSaleGroupMeta([productId]));
  }

  function decreaseQuantity(productId: number) {
    dlog("⬇️ decreaseQuantity()", { id: productId });
    setCartItems((prev) =>
      prev
        .map((i) =>
          i.id === productId && i.quantity > 1 ? { ...i, quantity: i.quantity - 1 } : i
        )
        .filter((i) => i.quantity > 0)
    );
  }

  async function refreshStockStatus() {
    const ids = cartItems.map((item) => item.id);
    if (ids.length === 0) return;
    dlog("🔁 refreshStockStatus for IDs:", ids);
    try {
      const res = await fetch("/api/products/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        dwarn("stock fetch not ok:", res.status, res.statusText);
        return;
      }
      const stockMap: Record<number, boolean> = await res.json();
      dlog("📦 stockMap:", stockMap);
      setCartItems((prev) =>
        prev.map((item) => ({ ...item, inStock: stockMap[item.id] ?? true }))
      );
    } catch (err) {
      derror("❌ Failed to refresh stock:", err);
    }
  }

  if (!hydrated) return null;

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        clearCart,
        increaseQuantity,
        decreaseQuantity,
        refreshStockStatus,
        refreshSaleGroups,
        updateStockStatus: (productId: number, inStock: boolean) => {
          dlog("✏️ updateStockStatus()", { id: productId, inStock });
          setCartItems((prev) =>
            prev.map((item) => (item.id === productId ? { ...item, inStock } : item))
          );
        },
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
