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

  // image = committed full S3 URL (only changes when user selects an item)
  const [image, setImage] = useState("");
  // imageDraft = text the user types / sees in the selector input
  const [imageDraft, setImageDraft] = useState("");
  const [name, setName] = useState("");

  const [loading, setLoading] = useState(false);

  // S3 images for selector
  const [imageItems, setImageItems] = useState<
    { id: number; name: string; image: string }[]
  >([]);

  // URLs already used by other sale groups (to disable them)
  const [usedImages, setUsedImages] = useState<Set<string>>(new Set());

  // helper: basename without extension from a URL
  const fileBase = (url: string) => {
    const file = url.split("/").pop() || "";
    return file.split(".")[0];
  };

  // fetch used images (from existing sale groups)
  useEffect(() => {
    fetch("/api/sale-groups")
      .then((res) => res.json())
      .then((data) => {
        const groups = Array.isArray(data.saleGroups) ? data.saleGroups : [];
        const used = new Set<string>();
        groups.forEach((g: { image?: string }) => {
          if (g.image) used.add(g.image);
        });
        setUsedImages(used);
      })
      .catch((err) => console.error("Failed to fetch sale groups", err));
  }, []);

  // fetch S3 images
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/images");
        if (!res.ok) throw new Error("Failed to load images");
        const paths: string[] = await res.json();

        const items = paths.map((path, idx) => ({
          id: idx,
          name: fileBase(path),
          image: path, // full S3 URL
        }));

        // if something is prefilled in state (unlikely), ensure it exists
        if (image && !items.find((i) => i.image === image)) {
          items.push({ id: -1, name: fileBase(image), image });
        }

        setImageItems(items);
      } catch (e) {
        console.error("Failed to load images", e);
        setImageItems([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          image, // full S3 URL committed from selection
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

  const previewSrc = image || "";

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 text-sm sm:text-base">
      <h1 className="text-xl sm:text-2xl font-bold text-center mb-6">
        קבוצת מבצע חדשה
      </h1>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left: form inputs */}
        <div className="w-full md:w-1/2 space-y-4">
          <ImageSelector
            // Disable images that are already used (by URL)
            items={imageItems
              .map((i) => ({ ...i, disabled: usedImages.has(i.image) }))
              .sort((a, b) => Number(!!a.disabled) - Number(!!b.disabled))}
            // use the draft to allow free typing
            value={imageDraft}
            onChange={(item) => {
              if (!item) {
                setImageDraft("");
                setImage("");
                return;
              }
              // Free typing case → ImageSelector sends { id:"", name:"typed" }
              if (!("image" in item) || !item.image) {
                setImageDraft(item.name);
                // do not change committed URL yet
                return;
              }
              if (item.disabled) return;

              // Real selection from list → commit URL + show its basename
              setImage(item.image); // full S3 URL
              setImageDraft(item.name); // human label
              setName((prev) => prev || item.name); // convenience: prefill name if empty
            }}
            // we already control the text, just echo it back
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

        {/* Right: preview */}
        <div className="w-full md:w-1/2">
          {previewSrc && (
            <Image
              src={previewSrc}
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
