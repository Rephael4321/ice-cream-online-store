"use client";

import SingleProduct from "@/components/single-product";

export default function IceScreams() {
  const Popsicles = [
    { image: "/popsicle.png", name: "פטליה שוקולד", price: 10 },
    { image: "/popsicle.png", name: "וניל וניל", price: 9 },
    { image: "/popsicle.png", name: "תות שדה מתוק", price: 11 },
    { image: "/popsicle.png", name: "פיסטוק מרענן", price: 12 },
    { image: "/popsicle.png", name: "בננה קרירה", price: 10 },
    { image: "/popsicle.png", name: "מנגו טרופי", price: 11 },
    { image: "/popsicle.png", name: "קרמל מלוח", price: 12 },
    { image: "/popsicle.png", name: "קוקוס אקזוטי", price: 10 },
    { image: "/popsicle.png", name: "אגוזי לוז פריכים", price: 11 },
    { image: "/popsicle.png", name: "עוגיות שמנת", price: 12 },
    { image: "/popsicle.png", name: "שוקולד מריר", price: 11 },
    { image: "/popsicle.png", name: "נוגט חם", price: 10 },
    { image: "/popsicle.png", name: "יוגורט פירות", price: 9 },
    { image: "/popsicle.png", name: "קינמון חורפי", price: 11 },
    { image: "/popsicle.png", name: "לימון רענן", price: 9 },
  ];

  return (
    <>
      {/* Page Title */}
      <div className="flex justify-center mt-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-pink-700">
          ארטיקים
        </h1>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 px-4 sm:px-8 py-10">
        {Popsicles.map((product, index) => (
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
