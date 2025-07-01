"use client";

import { createContext, useContext, useState, ReactNode } from "react";

// === Types ===

type SaleInfo = {
  amount: number;
  price: number;
  fromCategory?: boolean;
  category?: {
    id: number;
    name: string;
  };
};

type Product = {
  id: number;
  productImage: string;
  productName: string;
  productPrice: number;
  sale?: SaleInfo;
};

type CartItem = Product & { quantity: number };

type CartContextType = {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productName: string) => void;
  clearCart: () => void;
  getEffectiveUnitPrice: (item: CartItem) => number;
};

// === Context Setup ===

const CartContext = createContext<CartContextType | undefined>(undefined);

// === Sale Pricing Helpers ===

function getCategoryBundleMap(cart: CartItem[]) {
  const bundleMap = new Map<number, { totalQty: number; bundles: number }>();

  for (const item of cart) {
    const sale = item.sale;
    if (sale?.fromCategory && sale.category?.id != null) {
      const { id } = sale.category;
      const existing = bundleMap.get(id) ?? { totalQty: 0, bundles: 0 };
      const totalQty = existing.totalQty + item.quantity;
      const bundles = Math.floor(totalQty / sale.amount);
      bundleMap.set(id, { totalQty, bundles });
    }
  }

  return bundleMap;
}

function getEffectiveTotalPrice(
  item: CartItem,
  cart: CartItem[],
  bundleMap: Map<number, { totalQty: number; bundles: number }>
): number {
  const base = item.productPrice;
  const qty = item.quantity;

  if (!item.sale) return base * qty;

  const { amount, price, fromCategory, category } = item.sale;

  // Product-level sale
  if (!fromCategory) {
    const bundles = Math.floor(qty / amount);
    const remainder = qty % amount;
    return bundles * price + remainder * base;
  }

  // Category-level sale
  if (fromCategory && category?.id != null) {
    const info = bundleMap.get(category.id);
    if (!info || info.totalQty < amount || info.bundles === 0)
      return base * qty;

    const { totalQty, bundles } = info;
    const ratio = qty / totalQty;
    const myBundles = Math.floor(bundles * ratio);
    const discountedQty = myBundles * amount;
    const remainingQty = Math.max(0, qty - discountedQty);

    return myBundles * price + remainingQty * base;
  }

  return base * qty;
}

// === Provider ===

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  function addToCart(product: Product, quantity: number) {
    setCartItems((prev) => {
      const existing = prev.find(
        (item) => item.productName === product.productName
      );
      if (existing) {
        return prev.map((item) =>
          item.productName === product.productName
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
  }

  function removeFromCart(productName: string) {
    setCartItems((prev) =>
      prev.filter((item) => item.productName !== productName)
    );
  }

  function clearCart() {
    setCartItems([]);
  }

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        clearCart,
        getEffectiveUnitPrice: (item) => {
          if (item.quantity === 0) return item.productPrice;
          const bundleMap = getCategoryBundleMap(cartItems);
          const total = getEffectiveTotalPrice(item, cartItems, bundleMap);
          return total / item.quantity;
        },
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// === Hook ===

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
