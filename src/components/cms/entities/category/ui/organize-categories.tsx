"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/cms/ui";
import Image from "next/image";
import { apiGet, apiPut } from "@/lib/api/client";

// Raw shape from API
interface RawCategory {
  id: number;
  name: string;
  image?: string;
  type?: string;
  sort_order?: number;
  multi_item_sort_order?: number;
}

// Local UI shape
interface Category {
  id: number;
  name: string;
  image?: string;
  sort_order: number;
}

export default function OrganizeCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    apiGet("/api/categories?full=true")
      .then((res) => res.json())
      .then((data) => {
        const parsed: Category[] = data.categories
          .filter(
            (c: RawCategory) =>
              c.type === "collection" || c.type === "sale" || !c.type
          )
          .map((c: RawCategory) => ({
            id: c.id,
            name: c.name,
            image: c.image,
            sort_order: c.multi_item_sort_order ?? c.sort_order ?? 0,
          }))
          .sort((a: Category, b: Category) => a.sort_order - b.sort_order);

        setCategories(parsed);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);

    const reordered = arrayMove(categories, oldIndex, newIndex);
    setCategories(reordered);
  }

  async function saveOrder() {
    setSaving(true);
    try {
      const categoryOrder = categories.map((c) => c.id);
      const res = await apiPut("/api/categories/order", { categoryOrder });

      if (!res.ok) throw new Error("Failed to save order");
      alert("✅ סדר הקטגוריות נשמר בהצלחה!");
    } catch (err) {
      alert("❌ שגיאה בשמירת הסדר");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="p-4">טוען קטגוריות...</p>;

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-center">סידור קטגוריות</h1>
        <Button onClick={saveOrder} disabled={saving}>
          {saving ? "שומר..." : "שמור סדר"}
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={categories.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {categories.map((category) => (
              <SortableCategory key={category.id} category={category} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableCategory({ category }: { category: Category }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="w-full border p-6 rounded-2xl shadow-lg flex items-center gap-6 bg-white min-h-[100px]"
    >
      <div
        {...attributes}
        {...listeners}
        className="text-3xl font-bold text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none pr-2"
        title="גרור להזזה"
      >
        ≡
      </div>

      {category.image && (
        <Image
          src={category.image}
          alt={category.name}
          width={64}
          height={64}
          className="rounded-xl object-contain w-16 h-16"
        />
      )}

      <div className="text-xl font-medium">{category.name}</div>
    </div>
  );
}
