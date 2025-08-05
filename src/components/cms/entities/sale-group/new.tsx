"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/cms/ui/input";
import { Button } from "@/components/cms/ui/button";
import { showToast } from "@/components/cms/ui/toast";
import ImageSelector from "@/components/cms/ui/image-selector";
import { images } from "@/data/images";
import Image from "next/image";

export default function NewSaleGroupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [imagePathMap, setImagePathMap] = useState<Record<string, string>>({});
  const [usedImages, setUsedImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/sale-groups")
      .then((res) => res.json())
      .then((data) => {
        const used = new Set<string>();
        data.forEach((group: { image: string }) => {
          if (group.image) used.add(group.image);
        });
        setUsedImages(used);
      })
      .catch((err) => console.error("Failed to fetch sale groups", err));
  }, []);

  const getDisplayName = (path: string): string => {
    const file = path.split("/").pop() || "";
    return file.split(".")[0];
  };

  const imageItems = images
    .map((path, index) => ({
      id: index,
      name: getDisplayName(path),
      image: path,
      disabled: usedImages.has(path),
    }))
    .sort((a, b) => Number(a.disabled) - Number(b.disabled));

  const handleSubmit = async () => {
    setLoading(true);

    const fullImagePath =
      imagePathMap[image] ||
      images.find((img) => getDisplayName(img) === image) ||
      "";

    try {
      const res = await fetch("/api/sale-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          image: fullImagePath || null,
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

  const previewSrc =
    imagePathMap[image] ||
    images.find((img) => getDisplayName(img) === image) ||
    "";

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 text-sm sm:text-base">
      <h1 className="text-xl sm:text-2xl font-bold text-center mb-6">
        קבוצת מבצע חדשה
      </h1>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left: form inputs */}
        <div className="w-full md:w-1/2 space-y-4">
          <ImageSelector
            items={imageItems}
            value={image}
            onChange={(item) => {
              if (!item || item.disabled) return;
              setImage(item.name);
              setName(item.name);
              setImagePathMap((prev) => ({
                ...prev,
                [item.name]: item.image || "",
              }));
            }}
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
