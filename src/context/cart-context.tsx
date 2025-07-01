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

type GroupedCartItem = {
  categoryId: number;
  categoryName: string;
  amount: number;
  price: number;
  items: CartItem[];
  totalQty: number;
  totalPrice: number;
  fullPrice: number;
  discount: number;
};

type CartContextType = {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productName: string) => void;
  clearCart: () => void;
  removeGroupedCategory: (categoryId: number) => void;
  getGroupedCart: () => GroupedCartItem[];
};

// === Context Setup ===

const CartContext = createContext<CartContextType | undefined>(undefined);

// === Logic Helpers ===

function groupCartItems(cart: CartItem[]): GroupedCartItem[] {
  const map = new Map<number, GroupedCartItem>();

  for (const item of cart) {
    const { sale } = item;

    if (sale?.fromCategory && sale.category?.id != null) {
      const categoryId = sale.category.id;
      const existing = map.get(categoryId);

      if (existing) {
        existing.items.push(item);
        existing.totalQty += item.quantity;
        existing.fullPrice += item.productPrice * item.quantity;
      } else {
        map.set(categoryId, {
          categoryId,
          categoryName: sale.category.name,
          amount: sale.amount,
          price: sale.price,
          items: [item],
          totalQty: item.quantity,
          fullPrice: item.productPrice * item.quantity,
          totalPrice: 0,
          discount: 0,
        });
      }
    }
  }

  for (const group of map.values()) {
    const bundles = Math.floor(group.totalQty / group.amount);
    const discountedQty = bundles * group.amount;
    const remainingQty = group.totalQty - discountedQty;
    const basePrice = group.items[0].productPrice;

    group.totalPrice = bundles * group.price + remainingQty * basePrice;
    group.discount = group.fullPrice - group.totalPrice;
  }

  return Array.from(map.values());
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

  function removeGroupedCategory(categoryId: number) {
    setCartItems((prev) =>
      prev.filter(
        (item) =>
          !item.sale?.fromCategory || item.sale.category?.id !== categoryId
      )
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
        removeGroupedCategory,
        getGroupedCart: () => groupCartItems(cartItems),
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
