export const dynamic = "force-dynamic";

import MainMenu from "@/components/store/main-menu";
import { getSiteUrl } from "@/lib/site-url";
import { redirect } from "next/navigation";

interface RootCategory {
  id: number;
  name: string;
}

const TEMP_HOME_CATEGORY_ID = 36;

const toPublicSlug = (name: string) =>
  name.trim().replace(/\s+/g, "-").toLowerCase();

export default async function MainMenuPage() {
  let category: RootCategory | undefined;

  try {
    const res = await fetch(`${getSiteUrl()}/api/categories/root`, {
      cache: "no-store",
    });

    if (res.ok) {
      const data = (await res.json()) as { categories?: RootCategory[] };
      category = data.categories?.find((item) => item.id === TEMP_HOME_CATEGORY_ID);
    }
  } catch (err) {
    console.warn("Failed to resolve temporary home category:", err);
  }

  if (category) {
    redirect(`/category-products/${encodeURIComponent(toPublicSlug(category.name))}`);
  }

  return <MainMenu />;
}
