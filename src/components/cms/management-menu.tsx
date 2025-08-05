"use client";

import Link from "next/link";

const entityGroups = [
  {
    title: "מוצרים",
    items: [
      {
        name: "מוצר חדש",
        description: "הקם מוצר חדש במערכת.",
        slug: "new-product",
      },
      {
        name: "רשימת מוצרים",
        description: "צפה בכל המוצרים במערכת.",
        slug: "products",
      },
      {
        name: "מוצרים שאזלו מהמלאי",
        description: "צפה והחזר מוצרים שאזלו.",
        slug: "products/out-of-stock",
      },
    ],
  },
  {
    title: "קטגוריות",
    items: [
      {
        name: "קטגוריה חדשה",
        description: "צור קטגוריה חדשה.",
        slug: "new-category",
      },
      {
        name: "רשימת קטגוריות",
        description: "נהל קטגוריות קיימות.",
        slug: "categories",
      },
      {
        name: "ניהול קטגוריות",
        description: "קישור פריטים, תתי קטגוריות.",
        slug: "link-product-to-category",
      },
    ],
  },
  {
    title: "מבצעים",
    items: [
      {
        name: "קבוצה חדשה",
        description: "צור קבוצת מבצע חדשה.",
        slug: "sale-groups/new",
      },
      {
        name: "קבוצות מבצע",
        description: "צפה ונהל קבוצות מבצע קיימות.",
        slug: "sale-groups",
      },
    ],
  },
  {
    title: "הזמנות",
    items: [
      {
        name: "צפה והכן הזמנות",
        description: "נהל את ההזמנות שנכנסו.",
        slug: "orders",
      },
    ],
  },
  {
    title: "לקוחות",
    items: [
      {
        name: "רשימת לקוחות",
        description: "ניהול וצפייה בפרטי לקוחות.",
        slug: "clients",
      },
    ],
  },
];

export default function ManagementMenu() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-center mb-8">כלי ניהול</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {entityGroups.map((group) => (
          <div
            key={group.title}
            className="border rounded-2xl shadow bg-white p-4"
          >
            <h2 className="text-xl font-semibold text-purple-700 mb-4">
              {group.title}
            </h2>
            <div className="flex flex-wrap gap-3">
              {group.items.map((item) => (
                <Link
                  key={item.slug}
                  href={`/${item.slug}`}
                  className="w-36 p-4 border rounded-xl shadow-sm hover:shadow-md transition bg-gray-50 hover:bg-gray-100"
                >
                  <h3 className="text-sm font-semibold mb-1">{item.name}</h3>
                  <p className="text-xs text-gray-600">{item.description}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
