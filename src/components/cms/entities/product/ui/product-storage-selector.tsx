"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  showToast,
} from "@/components/cms/ui";
import { apiGet, apiPost } from "@/lib/api/client";

interface StorageArea {
  id: number;
  name: string;
  sort_order: number;
}

interface Props {
  productId: number;
  initialStorageAreaId?: number | null;
  disabled?: boolean;
  mode?: "edit" | "new";
  onChange?: (storageId: number | null) => void;
}

export default function ProductStorageSelector({
  productId,
  initialStorageAreaId,
  disabled,
  mode = "edit",
  onChange,
}: Props) {
  const [areas, setAreas] = useState<StorageArea[]>([]);
  const [selected, setSelected] = useState<string | undefined>(
    initialStorageAreaId?.toString()
  );

  useEffect(() => {
    const fetchAreas = async () => {
      const res = await apiGet("/api/storage/areas");
      const data = await res.json();
      setAreas(data.areas || []);
    };
    fetchAreas();
  }, []);

  const handleSelect = async (areaId: string) => {
    setSelected(areaId);
    const storage_area_id = areaId === "none" ? null : Number(areaId);

    if (mode === "new") {
      // only bubble up
      onChange?.(storage_area_id);
      return;
    }

    // edit mode → API
    const res = await apiPost("/api/storage/assign", {
      product_id: productId,
      storage_area_id,
    });

    if (res.ok) {
      showToast(
        storage_area_id === null
          ? "המוצר הוסר מאזור אחסון"
          : "המוצר שויך לאזור אחסון"
      );
    } else {
      const { error } = await res.json();
      showToast(error || "שגיאה בשיוך מוצר", "error");
    }
  };

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">אזור אחסון</label>
      <Select value={selected} onValueChange={handleSelect} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="בחר אזור אחסון" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">❌ ללא שיוך</SelectItem>
          {areas.map((area) => (
            <SelectItem key={area.id} value={area.id.toString()}>
              {area.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
