"use client";

import SingleProduct from "@/components/single-product";
import { PopsiclesProducts, PopsiclesSales } from "@/data/products";

export default function Popsicles() {
  return (
    <>
      {/* Title */}
      <div className="flex justify-center mt-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-pink-700">
          ארטיקים
        </h1>
      </div>

      {/* Responsive product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 px-4 sm:px-8 py-10">
        {PopsiclesProducts.map((product) => {
          const sale = PopsiclesSales[product.id];
          return (
            <SingleProduct
              key={product.id}
              productImage={product.image}
              productName={product.name}
              productPrice={product.price}
              sale={sale}
            />
          );
        })}
      </div>
    </>
  );
}
