"use client";

import SingleProduct from "@/components/single-product";

export default function IceScreams() {
  const IceScreams = [
    { image: "/ice-scream.png", name: "גלידת שוקולד קלאסי", price: 12 },
    { image: "/ice-scream.png", name: "גלידת וניל חלום", price: 11 },
    { image: "/ice-scream.png", name: "גלידת תות מתוק", price: 13 },
    { image: "/ice-scream.png", name: "גלידת פיסטוק טבעי", price: 14 },
    { image: "/ice-scream.png", name: "גלידת בננה שמנת", price: 12 },
    { image: "/ice-scream.png", name: "גלידת מנגו קיץ", price: 13 },
    { image: "/ice-scream.png", name: "גלידת קרמל מלוח", price: 14 },
    { image: "/ice-scream.png", name: "גלידת קוקוס אקזוטי", price: 12 },
    { image: "/ice-scream.png", name: "גלידת אגוזי לוז", price: 13 },
    { image: "/ice-scream.png", name: "גלידת עוגיות שמנת", price: 14 },
    { image: "/ice-scream.png", name: "גלידת שוקולד מריר", price: 13 },
    { image: "/ice-scream.png", name: "גלידת נוגט חמה", price: 12 },
    { image: "/ice-scream.png", name: "גלידת יוגורט פירות", price: 11 },
    { image: "/ice-scream.png", name: "גלידת קינמון חורפי", price: 13 },
    { image: "/ice-scream.png", name: "גלידת לימון רענן", price: 11 },
  ];

  return (
    <>
      {/* Title */}
      <div className="flex justify-center mt-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-pink-700">
          גלידות
        </h1>
      </div>

      {/* Responsive product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 px-4 sm:px-8 py-10">
        {IceScreams.map((product, index) => (
          <SingleProduct
            key={index}
            productImage={product.image}
            productName={product.name}
            productPrice={product.price}
          />
        ))}
      </div>
    </>
  );
}
