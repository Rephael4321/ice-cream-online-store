"use client";

import { useCart } from "@/context/cart-context";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";

type SaleCategoryInfo = {
  id: number;
  name: string;
};

type SingleProductProps = {
  id: number;
  productImage: string;
  productName: string;
  productPrice: number;
  sale?: {
    amount: number;
    price: number;
    fromCategory?: boolean;
    category?: SaleCategoryInfo;
  };
};

export default function SingleProduct({
  id,
  productImage,
  productName,
  productPrice,
  sale,
}: SingleProductProps) {
  const { cartItems, addToCart, removeFromCart } = useCart();
  const router = useRouter();
  const pathname = usePathname();

  const cartItem = cartItems.find((item) => item.id === id);
  const quantity = cartItem?.quantity || 0;

  const currentCategorySlug = sale?.category?.name
    ?.replace(/\s+/g, "-")
    .toLowerCase();

  const alreadyInCategoryPage =
    decodeURIComponent(pathname || "") ===
    `/category-products/${currentCategorySlug}`;

  const handleAdd = () => {
    addToCart({ id, productImage, productName, productPrice, sale }, 1);
  };

  const handleRemove = () => {
    if (quantity <= 1) {
      removeFromCart(id);
    } else {
      addToCart({ id, productImage, productName, productPrice, sale }, -1);
    }
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-md p-4">
      {/* Mobile/tablet: horizontal row | Desktop: vertical card */}
      <div className="flex flex-row sm:flex-row lg:flex-col items-center gap-4">
        {/* Image */}
        <div className="relative w-20 h-20 flex-shrink-0">
          <Image
            src={productImage}
            alt={productName}
            fill
            className="object-contain rounded-md"
          />
          {sale && (
            <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-1 py-0.5 rounded-bl-md shadow">
              מבצע!
            </div>
          )}
        </div>

        {/* Info + buttons */}
        <div className="flex flex-1 flex-col lg:items-center lg:text-center sm:text-right text-sm">
          <div className="font-bold text-base text-gray-800">{productName}</div>

          <div className="text-gray-600">
            {sale ? (
              <>
                <div className="line-through text-red-500">
                  {productPrice} ש״ח
                </div>
                <div className="text-green-600 font-bold">
                  {sale.amount} ב- {sale.price} ש״ח
                </div>
              </>
            ) : (
              <div>{productPrice} ש״ח</div>
            )}
          </div>

          {sale?.fromCategory && sale.category && !alreadyInCategoryPage && (
            <div className="mt-1 text-yellow-600">
              <button
                onClick={() =>
                  router.push(`/category-products/${currentCategorySlug}`)
                }
                className="underline hover:text-yellow-500 text-xs"
              >
                גלו עוד מוצרים במבצע
              </button>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-2 mt-2 lg:justify-center">
            <button
              onClick={handleAdd}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 text-lg hover:border-gray-500"
            >
              +
            </button>

            <span className="w-5 text-center text-base font-bold">
              {quantity}
            </span>

            <button
              onClick={handleRemove}
              disabled={quantity === 0}
              className={`w-8 h-8 flex items-center justify-center rounded-full border text-gray-700 text-lg ${
                quantity === 0
                  ? "border-gray-200 opacity-40 cursor-not-allowed"
                  : "border-gray-300 hover:border-gray-500"
              }`}
            >
              –
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
