"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/cms/ui/input";
import { Button } from "@/components/cms/ui/button";
import { showToast } from "@/components/cms/ui/toast";
import ImageSelector from "@/components/cms/ui/image-selector";
import Image from "next/image";

export default function NewSaleGroupForm() {
  const router = useRouter();

  const [image, setImage] = useState("");
  const [imageDraft, setImageDraft] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const [imageItems, setImageItems] = useState<
    { id: number; name: string; image: string }[]
  >([]);

  const [usedImages, setUsedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const [groupsRes, imagesRes] = await Promise.all([
          fetch("/api/sale-groups"),
          fetch("/api/images"),
        ]);

        if (!groupsRes.ok || !imagesRes.ok) throw new Error("Load failed");

        // Load used images
        const groupData = await groupsRes.json();
        const groups = Array.isArray(groupData.saleGroups)
          ? groupData.saleGroups
          : [];
        const used = new Set<string>();
        groups.forEach((g: { image?: string }) => {
          if (typeof g.image === "string") used.add(g.image);
        });
        setUsedImages(used);

        // Load image options
        const imagePaths: { key: string; url: string }[] =
          await imagesRes.json();
        const items = imagePaths.map(({ key, url }, idx) => {
          const file = key.split("/").pop() || "";
          const name = file.split(".")[0];
          return { id: idx, name, image: url };
        });

        if (image && !items.find((i) => i.image === image)) {
          const file = image.split("/").pop() || "";
          const name = file.split(".")[0];
          items.push({ id: -1, name, image });
        }

        setImageItems(items);
      } catch (e) {
        console.error("Failed to load sale group form data", e);
        showToast("שגיאה בטעינת הנתונים", "error");
        setImageItems([]);
      }
    })();
  }, []);

  const handleSubmit = async () => {
    if (!image) {
      showToast("נא לבחור תמונה מתוך הרשימה", "error");
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
        }),
      });

      if (!res.ok) throw new Error();
      const data = await res.json();

      showToast("קבוצת מבצע נוצרה בהצלחה", "success");
      router.push(`/sale-groups/${data.id}`);
    } catch (err) {
      showToast("שגיאה ביצירת הקבוצה", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 text-sm sm:text-base">
      <h1 className="text-xl sm:text-2xl font-bold text-center mb-6">
        קבוצת מבצע חדשה
      </h1>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="w-full md:w-1/2 space-y-4">
          <ImageSelector
            items={imageItems
              .map((i) => ({ ...i, disabled: usedImages.has(i.image) }))
              .sort((a, b) => Number(!!a.disabled) - Number(!!b.disabled))}
            value={imageDraft}
            onChange={(item) => {
              if (!item) {
                setImageDraft("");
                setImage("");
                return;
              }
              if (!("image" in item) || !item.image) {
                setImageDraft(item.name);
                return;
              }
              if (item.disabled) return;

              setImage(item.image);
              setImageDraft(item.name);
              setName((prev) => prev || item.name);
            }}
            getDisplayValue={(val) => val}
            placeholder="שם תמונה (אפשר להקליד או לבחור)"
            label="תמונה"
            disabled={loading}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              שם הקבוצה
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading || !image}
            className="w-full mt-4"
          >
            {loading ? "שולח..." : "צור קבוצה"}
          </Button>
        </div>

        <div className="w-full md:w-1/2">
          {image && (
            <Image
              src={image}
              alt="תצוגה מקדימה"
              width={500}
              height={300}
              className="w-full max-h-96 object-contain border rounded-md"
            />
          )}
        </div>
      </div>
    </div>
  );
}
