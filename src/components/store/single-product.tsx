"use client";

import { useCart } from "@/context/cart-context";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

type SaleCategoryInfo = {
  id: number;
  name: string;
};

type SingleProductProps = {
  id: number;
  productImage: string;
  productName: string;
  productPrice: number;
  inStock: boolean;
  sale?: {
    amount: number;
    price: number;
    fromCategory?: boolean;
    category?: SaleCategoryInfo;
  };
  isAdmin?: boolean;
};

export default function SingleProduct({
  id,
  productImage,
  productName,
  productPrice,
  inStock,
  sale,
  isAdmin = false,
}: SingleProductProps) {
  const { cartItems, addToCart, removeFromCart } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [showModal, setShowModal] = useState(false);

  const cartItem = cartItems.find((item) => item.id === id);
  const quantity = cartItem?.quantity || 0;

  const currentCategorySlug = sale?.category?.name
    ?.replace(/\s+/g, "-")
    .toLowerCase();

  const alreadyInCategoryPage =
    decodeURIComponent(pathname || "") ===
    `/category-products/${currentCategorySlug}`;

  const handleAdd = () => {
    if (!inStock) return;
    addToCart({ id, productImage, productName, productPrice, sale }, 1);
  };

  const handleRemove = () => {
    if (quantity <= 1) {
      removeFromCart(id);
    } else {
      addToCart({ id, productImage, productName, productPrice, sale }, -1);
    }
  };

  const handleImageClick = () => {
    if (!productImage) return;
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <>
      <div
        className={`relative w-full bg-white rounded-xl shadow-md p-4 ${
          !inStock ? "opacity-60" : ""
        }`}
      >
        {/* ✅ Admin Edit Button */}
        {isAdmin && (
          <Link
            href={`/products/${id}`}
            className="absolute top-2 left-2 px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 shadow"
          >
            ערוך
          </Link>
        )}

        <div className="flex flex-row sm:flex-row lg:flex-col items-center gap-4">
          {/* Image */}
          <div
            className="relative w-20 h-20 flex-shrink-0 cursor-pointer"
            onClick={handleImageClick}
          >
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
            {!inStock && (
              <div className="absolute bottom-0 left-0 bg-black bg-opacity-80 text-white text-[10px] px-1 py-0.5 rounded-tr-md shadow">
                אזל מהמלאי
              </div>
            )}
          </div>

          {/* Info + Buttons */}
          <div className="flex flex-1 flex-col lg:items-center lg:text-center sm:text-right text-sm">
            <div className="font-bold text-base text-gray-800">
              {productName}
            </div>

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

            <div className="flex items-center gap-2 mt-2 lg:justify-center">
              <button
                onClick={handleAdd}
                disabled={!inStock}
                className={`w-8 h-8 flex items-center justify-center rounded-full border text-gray-700 text-lg ${
                  inStock
                    ? "border-gray-300 hover:border-gray-500"
                    : "border-gray-200 opacity-40 cursor-not-allowed"
                }`}
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

      {/* Image Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center"
          onClick={handleCloseModal}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={productImage}
              alt={productName}
              width={600}
              height={600}
              className="object-contain rounded-xl max-w-full max-h-full"
            />
            <button
              onClick={handleCloseModal}
              className="absolute top-2 right-2 text-white text-2xl font-bold bg-black bg-opacity-50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-80"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
