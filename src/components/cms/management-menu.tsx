"use client";

import { CMS_SECTIONS, CMSSectionKey } from "@/components/cms/sections/config";
import Link from "next/link";
import {
  Boxes,
  FolderTree,
  BadgePercent,
  ReceiptText,
  Users2,
  Warehouse,
} from "lucide-react";

const SECTION_ORDER: CMSSectionKey[] = [
  "products",
  "categories",
  "saleGroups",
  "orders",
  "clients",
  "storage",
];

// Single primary action per section
function pickPrimaryLink(sectionKey: CMSSectionKey) {
  const sec = CMS_SECTIONS[sectionKey];
  return (
    sec.nav.find((n) => n.key === "list") ??
    sec.nav.find((n) => n.href === sec.base) ??
    sec.nav[0]
  );
}

function describe(section: CMSSectionKey, linkKey: string): string {
  switch (section) {
    case "products":
      if (linkKey === "new") return "הקם מוצר חדש במערכת.";
      if (linkKey === "oos") return "צפה והחזר מוצרים שאזלו.";
      if (linkKey === "images") return "ניהול תמונות ומעקב שימוש.";
      return "צפה ונטר את כל המוצרים.";
    case "categories":
      return linkKey === "new" ? "צור קטגוריה חדשה." : "נהל קטגוריות קיימות.";
    case "saleGroups":
      return linkKey === "new" ? "צור קבוצת מבצע חדשה." : "נהל קבוצות מבצע.";
    case "orders":
      return "צפה, הכן והשלם הזמנות.";
    case "clients":
      return "ניהול וצפייה בלקוחות.";
    case "storage":
      return "קבע אזורי אחסון פיזיים.";
    default:
      return "";
  }
}

const ICONS: Record<CMSSectionKey, any> = {
  products: Boxes,
  categories: FolderTree,
  saleGroups: BadgePercent,
  orders: ReceiptText,
  clients: Users2,
  storage: Warehouse,
};

const tiles = SECTION_ORDER.map((key) => {
  const sec = CMS_SECTIONS[key];
  const primary = pickPrimaryLink(key);
  return {
    key,
    title: sec.label,
    href: primary.href,
    action: primary.label,
    desc: describe(key, primary.key),
    Icon: ICONS[key],
  };
});

export default function ManagementMenu() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
      {/* Page title (no subtitle) */}
      <h1 className="text-2xl font-bold text-center mb-8">כלי ניהול</h1>

      {/* Bright, spacious tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tiles.map(({ key, title, href, action, desc, Icon }) => (
          <Link
            key={key}
            href={href}
            className="
              group relative isolate overflow-hidden rounded-3xl
              bg-white shadow-sm hover:shadow-md transition
              ring-1 ring-black/5 hover:ring-black/10 focus:outline-none
              focus-visible:ring-2 focus-visible:ring-indigo-400
            "
          >
            {/* Slim accent bar (keeps UI general-purpose) */}
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-indigo-500 via-sky-500 to-teal-400" />

            {/* Subtle background glow (light-only) */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-tr from-indigo-200 to-teal-200 opacity-30 blur-2xl" />

            <div className="relative p-6 sm:p-7">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl p-3 sm:p-3.5 bg-gradient-to-br from-indigo-50 to-sky-50 ring-1 ring-black/5">
                  <Icon className="h-6 w-6 text-indigo-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold tracking-tight">
                      {title}
                    </h2>
                    <span
                      className="
                        text-xs sm:text-sm shrink-0 rounded-full px-3 py-1
                        bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/80
                        group-hover:translate-x-0.5 transition
                      "
                    >
                      {action}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {desc}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
