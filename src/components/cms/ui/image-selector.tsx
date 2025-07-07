"use client";

import { useMemo, useState } from "react";
import { Input } from "./input";
import { Label } from "./label";
import Image from "next/image";

export interface BaseItem {
  id: number | string;
  name: string;
  image?: string | null;
}

interface ImageSelectorProps<T extends BaseItem> {
  items: T[];
  value: string;
  onChange: (item: T | null) => void;
  label?: string;
  placeholder?: string;
}

export default function ImageSelector<T extends BaseItem>({
  items,
  value,
  onChange,
  label = "תמונה",
  placeholder = "שם",
}: ImageSelectorProps<T>) {
  const [focused, setFocused] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

  const filteredItems = useMemo(() => {
    if (!value) return items.slice(0, 10);
    return items
      .filter((item) => item.name.toLowerCase().includes(value.toLowerCase()))
      .slice(0, 10);
  }, [items, value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const typed = e.target.value;
    onChange({ id: "", name: typed } as T);
  };

  const handleSuggestionClick = (item: T) => {
    onChange(item);
    setFocused(false);
  };

  return (
    <div className="relative">
      <Label htmlFor="image-input">{label}</Label>
      <Input
        id="image-input"
        name="image"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 100)}
        className="hover:cursor-pointer"
      />

      {focused && filteredItems.length > 0 && (
        <ul className="absolute z-10 w-full max-h-60 overflow-y-auto bg-white border rounded-md shadow top-full mt-1">
          {filteredItems.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
              onMouseDown={() => handleSuggestionClick(item)}
            >
              {item.image && (
                <div className="relative w-8 h-8">
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    className="object-cover rounded border"
                    unoptimized
                  />
                </div>
              )}
              <span>{item.name}</span>
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
              {items.map((item) => (
                <div
                  key={item.id}
                  className="cursor-pointer"
                  onClick={() => {
                    handleSuggestionClick(item);
                    setShowGallery(false);
                  }}
                >
                  <div className="relative w-full h-32 border rounded bg-white">
                    {item.image && (
                      <Image
                        src={item.image}
                        alt=""
                        fill
                        className="object-contain rounded"
                        unoptimized
                      />
                    )}
                  </div>
                  <p className="text-center text-xs mt-1">{item.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
