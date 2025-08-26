"use client";

import Link from "next/link";
import { CMS_SECTIONS, CMSSectionKey } from "@/components/cms/sections/config";

const SECTION_ORDER: CMSSectionKey[] = [
  "products",
  "categories",
  "saleGroups",
  "orders",
  "clients",
  "storage",
];

// Hebrew descriptions per section/link key
function describe(section: CMSSectionKey, linkKey: string): string {
  switch (section) {
    case "products":
      switch (linkKey) {
        case "new":
          return "הקם מוצר חדש במערכת.";
        case "list":
          return "צפה בכל המוצרים במערכת.";
        case "oos":
          return "צפה והחזר מוצרים שאזלו.";
        case "images":
          return "צפה בתמונות ובשימוש שלהן במוצרים.";
        default:
          return "";
      }
    case "categories":
      return linkKey === "new" ? "צור קטגוריה חדשה." : "נהל קטגוריות קיימות.";
    case "saleGroups":
      return linkKey === "new"
        ? "צור קבוצת מבצע חדשה."
        : "צפה ונהל קבוצות מבצע קיימות.";
    case "orders":
      return "נהל את ההזמנות שנכנסו.";
    case "clients":
      return "ניהול וצפייה בפרטי לקוחות.";
    case "storage":
      return "הגדר אזורי אחסון פיזיים למוצרים.";
    default:
      return "";
  }
}

const entityGroups = SECTION_ORDER.map((key) => {
  const sec = CMS_SECTIONS[key];
  return {
    title: sec.label,
    items: sec.nav.map((n) => ({
      name: n.label,
      description: describe(key, n.key),
      slug: n.href.startsWith("/") ? n.href.slice(1) : n.href,
    })),
  };
});

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
