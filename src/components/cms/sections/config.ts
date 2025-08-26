export type CMSLink = { key: string; label: string; href: string };

export type CMSSection = {
  label: string; // default title for the section
  base: `/${string}`; // base path
  nav: CMSLink[]; // buttons shown on every page inside this section
};

export const CMS_SECTIONS = {
  products: {
    label: "מוצרים",
    base: "/products",
    nav: [
      { key: "list", label: "רשימת מוצרים", href: "/products" },
      { key: "new", label: "מוצר חדש", href: "/products/new" },
      { key: "oos", label: "אזלו מהמלאי", href: "/products/out-of-stock" },
      { key: "images", label: "ניהול תמונות", href: "/products/images" },
    ],
  } as const satisfies CMSSection,

  categories: {
    label: "קטגוריות",
    base: "/categories",
    nav: [
      { key: "list", label: "רשימת קטגוריות", href: "/categories" },
      { key: "new", label: "קטגוריה חדשה", href: "/categories/new" },
    ],
  } as const satisfies CMSSection,

  saleGroups: {
    label: "מבצעים",
    base: "/sale-groups",
    nav: [
      { key: "list", label: "קבוצות מבצע", href: "/sale-groups" },
      { key: "new", label: "קבוצה חדשה", href: "/sale-groups/new" },
    ],
  } as const satisfies CMSSection,

  orders: {
    label: "הזמנות",
    base: "/orders",
    nav: [{ key: "list", label: "צפה והכן הזמנות", href: "/orders" }],
  } as const satisfies CMSSection,

  clients: {
    label: "לקוחות",
    base: "/clients",
    nav: [{ key: "list", label: "רשימת לקוחות", href: "/clients" }],
  } as const satisfies CMSSection,

  storage: {
    label: "אחסון",
    base: "/storage-areas",
    nav: [{ key: "areas", label: "ניהול אזורים", href: "/storage-areas" }],
  } as const satisfies CMSSection,
} as const;

export type CMSSectionKey = keyof typeof CMS_SECTIONS;
