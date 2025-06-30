"use client";

import Link from "next/link";

const services = [
  {
    name: "מוצר חדש",
    description: "הקם מוצר חדש במערכת.",
    slug: "new-product",
  },
  {
    name: "מוצרים",
    description: "צפה ברשימת המוצרים.",
    slug: "products",
  },
  {
    name: "קטגוריה חדשה",
    description: "צור קטגוריה חדשה.",
    slug: "new-category",
  },
  {
    name: "ניהול קטגוריות",
    description: "הוסף פריטים לקטגוריות. צור תתי קטגוריות.",
    slug: "link-product-to-category",
  },
];

export default function ManagementMenu() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-center mb-8">Management Menu</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <Link
            key={service.slug}
            href={`/${service.slug}`}
            className="block p-6 border rounded-2xl shadow hover:shadow-md transition bg-white hover:bg-gray-50"
          >
            <h2 className="text-lg font-semibold mb-2">{service.name}</h2>
            <p className="text-sm text-gray-600">{service.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
