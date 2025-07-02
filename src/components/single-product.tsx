"use client";

import { useState } from "react";
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
  const { addToCart } = useCart();
  const [amount, setAmount] = useState(1);
  const router = useRouter();
  const pathname = usePathname();

  const currentCategorySlug = sale?.category?.name
    ?.replace(/\s+/g, "-")
    .toLowerCase();

  const alreadyInCategoryPage =
    decodeURIComponent(pathname || "") ===
    `/category-products/${currentCategorySlug}`;

  return (
    <div className="shadow-md p-4 w-full sm:w-[300px] flex flex-col items-center space-y-4 relative">
      <div className="w-[120px] h-[120px] relative rounded-md bg-white">
        <Image
          src={productImage}
          alt={productName}
          fill
          className="object-contain"
        />
      </div>

      {sale && (
        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold shadow-lg">
          מבצע!
        </div>
      )}

      <div className="space-y-1 bg-[#ff4090] p-3 rounded-lg shadow-md text-center w-full min-h-[112px] flex flex-col justify-center">
        <p className="font-semibold text-lg sm:text-xl text-white">
          {productName}
        </p>
        <p
          className={`text-base sm:text-lg text-white ${
            sale ? "line-through opacity-70" : ""
          }`}
        >
          {productPrice} ש״ח
        </p>

        {sale ? (
          <>
            <p className="text-lg sm:text-xl font-bold text-green-300">
              {sale.amount} ב- {sale.price} ש״ח
            </p>

            {sale.fromCategory && sale.category && !alreadyInCategoryPage && (
              <p className="text-sm text-yellow-200 italic">
                <button
                  onClick={() =>
                    router.push(`/category-products/${currentCategorySlug}`)
                  }
                  className="underline hover:text-yellow-100 font-bold"
                >
                  גלו עוד מוצרים במבצע
                </button>
              </p>
            )}
          </>
        ) : (
          <p className="text-lg sm:text-xl font-bold opacity-0 select-none">
            0 ב- 0 ש״ח
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() =>
            addToCart(
              { id, productImage, productName, productPrice, sale },
              amount
            )
          }
          className="px-4 py-2 bg-[#3333f6] rounded text-white hover:bg-[#45df43] transition cursor-pointer text-sm sm:text-base"
        >
          הוסף
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAmount((prev) => prev + 1)}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 text-xl hover:border-gray-500 cursor-pointer"
          >
            +
          </button>
          <p className="w-6 text-center">{amount}</p>
          <button
            onClick={() => setAmount((prev) => Math.max(1, prev - 1))}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 text-xl hover:border-gray-500 cursor-pointer"
          >
            -
          </button>
        </div>
      </div>
    </div>
  );
}
