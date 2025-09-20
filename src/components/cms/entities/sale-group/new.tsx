"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/cms/ui/input";
import { Button } from "@/components/cms/ui/button";
import { showToast } from "@/components/cms/ui/toast";
import { HeaderHydrator } from "@/components/cms/sections/header/section-header";
import ImagePickerPanel, {
  baseName as baseNameFromPicker,
} from "@/components/cms/shared/image-picker-panel";

export default function NewSaleGroupForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [image, setImage] = useState(""); // full S3 URL
  const [loading, setLoading] = useState(false);

  // NEW: increment step (default 1)
  const [incrementStep, setIncrementStep] = useState<number>(1);

  // track images already used by sale groups (to disable picking them)
  const [usedImages, setUsedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    // load used images from existing sale groups
    (async () => {
      try {
        const groupsRes = await fetch("/api/sale-groups", {
          cache: "no-store",
        });
        if (!groupsRes.ok) throw new Error("Failed loading groups");
        const groupData = await groupsRes.json();
        const groups = Array.isArray(groupData.saleGroups)
          ? groupData.saleGroups
          : [];
        const used = new Set<string>();
        groups.forEach((g: { image?: string }) => {
          if (typeof g.image === "string") used.add(g.image);
        });
        setUsedImages(used);
      } catch (e) {
        console.error(e);
        // not fatal; we’ll just not disable any
      }
    })();
  }, []);

  // --------- submit
  const handleSubmit = async () => {
    if (!image) {
      showToast("נא לבחור תמונה", "error");
      return;
    }
    if (!Number.isFinite(incrementStep) || incrementStep < 1) {
      showToast("צעד חייב להיות מספר חיובי (מינימום 1)", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/sale-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          image,
          increment_step: incrementStep,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();

      showToast("קבוצת מבצע נוצרה בהצלחה", "success");
      router.push(`/sale-groups/${data.id}`);
    } catch {
      showToast("שגיאה ביצירת הקבוצה", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="max-w-5xl mx-auto p-4 sm:p-6 text-sm sm:text-base"
      dir="rtl"
    >
      <HeaderHydrator title="קבוצת מבצע חדשה" />

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* LEFT */}
        <div className="w-full md:w-1/2 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              שם הקבוצה
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              placeholder=""
            />
          </div>

          {/* NEW: increment step input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              צעד הוספה
            </label>
            <Input
              type="number"
              min={1}
              step={1}
              value={incrementStep}
              onChange={(e) =>
                setIncrementStep(Math.max(1, Number(e.target.value || 1)))
              }
              disabled={loading}
              placeholder="1"
            />
            <p className="text-[12px] text-gray-500 mt-1">
              כשלקוחות מוסיפים פריטים מקבוצת המבצע, הכמות תעלה בקפיצות של הערך
              הזה.
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading || !image}
            className="w-full mt-4"
          >
            {loading ? "שולח..." : "צור קבוצה"}
          </Button>
        </div>

        {/* RIGHT = shared image picker */}
        <aside className="w-full md:w-1/2 space-y-4">
          <ImagePickerPanel
            value={image}
            disabled={loading}
            googleQuery={name || "ice cream"}
            previewClassName="relative w-full h-80 border rounded-md bg-white"
            blocklist={[...usedImages]} // <-- prevent selecting images already used by other sale groups
            onChange={(url) => {
              setImage(url);
              setName((prev) => prev || baseNameFromPicker(url));
            }}
          />
        </aside>
      </div>
    </main>
  );
}
