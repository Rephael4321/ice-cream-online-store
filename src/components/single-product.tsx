"use client";

import { useState } from "react";
import { useCart } from "@/context/cart-context";
import Image from "next/image";

type SingleProductProps = {
  productImage: string;
  productName: string;
  productPrice: number;
};

export default function SingleProduct({
  productImage,
  productName,
  productPrice,
}: SingleProductProps) {
  const { addToCart } = useCart();
  const [amount, setAmount] = useState(1);

  return (
    <div className="shadow-md p-4 w-full sm:w-[300px] flex flex-col items-center space-y-4">
      <Image
        src={productImage}
        width={90}
        height={120}
        alt="ice cream"
        className="rounded-md"
      />

      <div className="space-y-1 bg-[#ff4090] p-3 rounded-lg shadow-md text-center w-full">
        <p className="font-semibold text-lg sm:text-xl text-white">
          {productName}
        </p>
        <p className="text-base sm:text-lg text-white">{productPrice} ש"ח</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() =>
            addToCart({ productImage, productName, productPrice }, amount)
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
            onClick={() => setAmount((prev) => Math.max(0, prev - 1))}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 text-xl hover:border-gray-500 cursor-pointer"
          >
            -
          </button>
        </div>
      </div>
    </div>
  );
}
