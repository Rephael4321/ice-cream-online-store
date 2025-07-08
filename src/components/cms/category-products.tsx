"use client";

import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
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

export default function CategoryProducts({ id }: { id: string }) {
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

  const sensors = useSensors(useSensor(PointerSensor));

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
      {...attributes}
      {...listeners}
      className="w-full border p-3 rounded shadow flex items-center gap-4 bg-white cursor-move"
    >
      <Image
        src={product.image}
        alt={product.name}
        width={60}
        height={60}
        className="rounded object-contain w-16 h-16"
      />
      <div className="flex-1">
        <div className="font-semibold">{product.name}</div>
        <div className="text-sm text-gray-600">
          ₪{Number(product.price).toFixed(2)}
          {product.sale_price !== null && (
            <span className="ml-2 text-green-600 font-bold">
              מבצע: ₪{Number(product.sale_price).toFixed(2)} (
              {product.sale_quantity} יח')
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
