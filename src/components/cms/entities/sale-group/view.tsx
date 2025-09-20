"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { showToast } from "@/components/cms/ui/toast";
import { SaleGroupEditor } from "./ui/sale-group-editor";
import { HeaderHydrator } from "@/components/cms/sections/header/section-header";
import ImagePickerPanel from "@/components/cms/shared/image-picker-panel";

type SaleGroup = {
  id: number;
  name: string | null;
  quantity: number | string | null;
  sale_price: number | string | null;
  price: number | string | null;
  image: string | null;
  created_at: string;
  updated_at: string;
  categories: { id: number; name: string }[];
  increment_step: number;
};

export default function ViewSaleGroup() {
  const { id } = useParams() as { id: string };
  const [group, setGroup] = useState<SaleGroup | null>(null);
  const [loading, setLoading] = useState(true);

  // track images already used by *other* sale groups
  const [usedImages, setUsedImages] = useState<Set<string>>(new Set());

  // saving state for image updates
  const [savingImage, setSavingImage] = useState(false);

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        const [res, groupsRes] = await Promise.all([
          fetch(`/api/sale-groups/${id}`, { cache: "no-store" }),
          fetch(`/api/sale-groups`, { cache: "no-store" }),
        ]);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setGroup(data);

        const all = await groupsRes.json().catch(() => ({ saleGroups: [] }));
        const used = new Set<string>();
        (Array.isArray(all.saleGroups) ? all.saleGroups : []).forEach(
          (g: { id?: number; image?: string | null }) => {
            if (g?.image && g.id !== Number(id)) used.add(g.image);
          }
        );
        setUsedImages(used);
      } catch {
        showToast("שגיאה בטעינת פרטי הקבוצה", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Save image URL to the group
  async function saveImage(url: string | null) {
    if (!group) return;
    setSavingImage(true);
    try {
      const res = await fetch(`/api/sale-groups/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: url }),
      });
      if (!res.ok) throw new Error();
      setGroup((prev) => (prev ? { ...prev, image: url } : prev));
      showToast("התמונה עודכנה בהצלחה", "success");
    } catch {
      showToast("שגיאה בעדכון התמונה", "error");
    } finally {
      setSavingImage(false);
    }
  }

  if (loading) {
    return (
      <main className="p-6" dir="rtl">
        <HeaderHydrator title="עריכת קבוצת מבצע" />
        <p className="text-center mt-8">טוען פרטי קבוצה...</p>
      </main>
    );
  }

  if (!group) {
    return (
      <main className="p-6" dir="rtl">
        <HeaderHydrator title="עריכת קבוצת מבצע" />
        <p className="text-center mt-8 text-red-600">קבוצה לא נמצאה</p>
      </main>
    );
  }

  return (
    <main className="p-6" dir="rtl">
      <HeaderHydrator title="עריכת קבוצת מבצע" />

      <div className="max-w-5xl mx-auto mt-6 flex flex-col md:flex-row gap-6 items-start relative">
        {savingImage && (
          <div className="absolute inset-0 bg-white/60 z-50 flex items-center justify-center rounded-md">
            <span className="text-xl font-semibold">שומר תמונה...</span>
          </div>
        )}

        {/* LEFT — fields/editor */}
        <div className="w-full md:w-1/2">
          <SaleGroupEditor
            id={group.id}
            initialName={group.name}
            initialQuantity={
              group.quantity !== null ? Number(group.quantity) : null
            }
            initialSalePrice={
              group.sale_price !== null ? Number(group.sale_price) : null
            }
            initialPrice={group.price !== null ? Number(group.price) : null}
            initialImage={group.image}
            initialCategories={group.categories || []}
            initialIncrementStep={group.increment_step || 1}
          />
        </div>

        {/* RIGHT — shared image picker */}
        <aside className="w-full md:w-1/2 space-y-4">
          <ImagePickerPanel
            value={group.image || ""}
            disabled={savingImage}
            googleQuery={group.name || "ice cream"}
            previewClassName="relative w-full h-80 border rounded-md bg-white"
            blocklist={usedImages} // disable images used by other sale groups
            onChange={(url) => saveImage(url)}
          />
        </aside>
      </div>
    </main>
  );
}
