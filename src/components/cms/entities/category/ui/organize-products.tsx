"use client";

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

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/cms/ui/button";

type Product = {
  id: number;
  name: string;
  image: string;
  price: number | string;
  sale_price: number | string | null;
  sale_quantity: number | null;
  sort_order: number;
};

export default function OrganizeProducts({ id }: { id: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/categories/${id}/products`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => setProducts(data.products))
      .finally(() => setLoading(false));
  }, [id]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = products.findIndex((p) => p.id === active.id);
    const newIndex = products.findIndex((p) => p.id === over.id);

    const reordered = arrayMove(products, oldIndex, newIndex);
    setProducts(reordered);
  }

  async function saveOrder() {
    setSaving(true);
    try {
      const productOrder = products.map((p) => p.id);
      const res = await fetch(`/api/categories/${id}/products/order`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ✅ send cookies!
        body: JSON.stringify({ productOrder }),
      });

      if (!res.ok) throw new Error("Failed to save order");
      alert("הסדר נשמר בהצלחה!");
    } catch (err) {
      alert("שגיאה בשמירת הסדר");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="p-4">טוען מוצרים...</p>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">סידור מוצרים בקטגוריה {id}</h1>
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
          items={products.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {products.map((product) => (
              <SortableProduct key={product.id} product={product} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableProduct({ product }: { product: Product }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="w-full border p-6 rounded-2xl shadow-lg flex items-center gap-8 bg-white min-h-[140px]"
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="text-3xl font-bold text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none pr-4"
        title="גרור להזזה"
      >
        ≡
      </div>

      <Image
        src={product.image}
        alt={product.name}
        width={96}
        height={96}
        className="rounded-xl object-contain w-24 h-24"
      />

      <div className="flex-1 space-y-2">
        <div className="font-bold text-2xl">{product.name}</div>
        <div className="text-lg text-gray-700">
          ₪{Number(product.price).toFixed(2)}
          {product.sale_price !== null && (
            <span className="ml-4 text-green-600 font-semibold">
              מבצע: ₪{Number(product.sale_price).toFixed(2)} (
              {product.sale_quantity} יח')
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
