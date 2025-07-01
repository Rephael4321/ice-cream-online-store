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

// === Sale Pricing Logic ===

function getEffectiveUnitPrice(item: CartItem, cart: CartItem[]): number {
  const base = item.productPrice;

  if (!item.sale) return base;

  const { amount, price, fromCategory, category } = item.sale;

  // Simple product-level sale
  if (!fromCategory) {
    return item.quantity >= amount ? price / amount : base;
  }

  // Category-level sale
  if (fromCategory && category?.id != null) {
    const groupQty = cart
      .filter(
        (i) => i.sale?.fromCategory && i.sale?.category?.id === category.id
      )
      .reduce((sum, i) => sum + i.quantity, 0);

    return groupQty >= amount ? price / amount : base;
  }

  return base;
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
        getEffectiveUnitPrice: (item) => getEffectiveUnitPrice(item, cartItems),
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
