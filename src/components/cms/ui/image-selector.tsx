"use client";

import { useState, useMemo } from "react";
import { Input } from "./input";
import { Label } from "./label";
import { images } from "@/data/images";
import Image from "next/image";

interface ImageSelectorProps {
  value: string;
  onChange: (imageName: string, fullPath: string) => void;
  label?: string;
  placeholder?: string;
}

export default function ImageSelector({
  value,
  onChange,
  label = "תמונה",
  placeholder = "ארטיק שוקו",
}: ImageSelectorProps) {
  const [focused, setFocused] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

  const getDisplayName = (path: string) => {
    const file = path.split("/").pop() || "";
    return file.split(".")[0];
  };

  const filteredImages = useMemo(() => {
    if (!value) return images.slice(0, 10);
    return images
      .filter((img) =>
        getDisplayName(img).toLowerCase().includes(value.toLowerCase())
      )
      .slice(0, 10);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value, "");
  };

  const handleSuggestionClick = (fullPath: string) => {
    const displayName = getDisplayName(fullPath);
    onChange(displayName, fullPath);
    setFocused(false);
  };

  return (
    <div className="relative">
      <Label htmlFor="image">{label}</Label>
      <Input
        id="image"
        name="image"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 100)}
      />

      {focused && filteredImages.length > 0 && (
        <ul className="absolute z-10 w-full max-h-60 overflow-y-auto bg-white border rounded-md shadow top-full mt-1">
          {filteredImages.map((img, idx) => (
            <li
              key={idx}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
              onMouseDown={() => handleSuggestionClick(img)}
            >
              <div className="relative w-8 h-8">
                <Image
                  src={img}
                  alt=""
                  fill
                  className="object-cover rounded border"
                  unoptimized
                />
              </div>
              <span>{getDisplayName(img)}</span>
            </li>
          ))}
          <li className="text-center px-3 py-2 border-t bg-gray-50">
            <button
              type="button"
              onMouseDown={() => setShowGallery(true)}
              className="text-blue-600 hover:underline text-sm"
            >
              הצג את כל התמונות
            </button>
          </li>
        </ul>
      )}

      {showGallery && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center"
          onClick={() => setShowGallery(false)}
        >
          <div
            className="bg-white max-w-4xl w-full max-h-[80vh] overflow-y-auto p-4 rounded shadow-lg relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4">גלריית תמונות</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="cursor-pointer"
                  onClick={() => {
                    handleSuggestionClick(img);
                    setShowGallery(false);
                  }}
                >
                  <div className="relative w-full h-32 border rounded bg-white">
                    <Image
                      src={img}
                      alt=""
                      fill
                      className="object-contain rounded"
                      unoptimized
                    />
                  </div>
                  <p className="text-center text-xs mt-1">
                    {getDisplayName(img)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
