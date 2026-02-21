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
import { Button } from "@/components/cms/ui/button";
import Image from "next/image";
import { apiGet, apiPut } from "@/lib/api/client";

type ProductItem = {
  type: "product";
  id: number;
  name: string;
  image: string;
  price: number;
  sale_price: number | null;
  sale_quantity: number | null;
  sort_order: number;
};

type SaleGroupItem = {
  type: "sale_group";
  id: number;
  name: string;
  image: string;
  price: number;
  sale_price: number;
  quantity: number;
  sort_order: number;
  products: {
    id: number;
    name: string;
    image: string;
    label: string;
    color: string;
  }[];
};

type Item = ProductItem | SaleGroupItem;

export default function OrganizeProducts({ name }: { name: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const enc = encodeURIComponent(name);
    apiGet(`/api/categories/name/${enc}/items`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const sorted = data.items.sort(
          (a: Item, b: Item) => a.sort_order - b.sort_order
        );
        setItems(sorted);
      })
      .finally(() => setLoading(false));
  }, [name]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    setItems(arrayMove(items, oldIndex, newIndex));
  }

  async function saveOrder() {
    setSaving(true);
    try {
      const enc = encodeURIComponent(name);
      const order = items.map((item) => ({ id: item.id, type: item.type }));
      const res = await apiPut(
        `/api/categories/name/${enc}/products/order`,
        { order }
      );
      if (!res.ok) throw new Error("Failed to save order");
      alert("הסדר נשמר בהצלחה!");
    } catch (err) {
      alert("שגיאה בשמירת הסדר");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="p-4">טוען פריטים...</p>;

  return (
    <div className="p-4 space-y-4">
      {/* Only a Save button (no inner title) */}
      <div className="flex justify-end items-center">
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
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {items.map((item) =>
              item.type === "product" ? (
                <SortableProduct key={`p-${item.id}`} product={item} />
              ) : (
                <SortableSaleGroup key={`g-${item.id}`} group={item} />
              )
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableProduct({ product }: { product: ProductItem }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: product.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="w-full border p-6 rounded-2xl shadow-lg flex items-center gap-8 bg-white min-h-[140px]"
    >
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

function SortableSaleGroup({ group }: { group: SaleGroupItem }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: group.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="w-full border p-6 rounded-2xl shadow-lg flex flex-col gap-4 bg-white"
    >
      <div className="flex items-center justify-between">
        <div
          {...attributes}
          {...listeners}
          className="text-3xl font-bold text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
          title="גרור להזזה"
        >
          ≡
        </div>
        {/* Removed inner title; keep compact meta if you like */}
        <div className="text-right">
          <div className="text-sm text-green-600">
            מבצע: {group.quantity} ב־₪{group.sale_price.toFixed(2)}
          </div>
        </div>
      </div>

      <Image
        src={group.image}
        alt={group.name}
        width={400}
        height={200}
        className="rounded-md w-full h-auto object-cover"
      />

      <div className="grid grid-cols-3 gap-2">
        {group.products.map((product) => (
          <div
            key={product.id}
            className="flex flex-col items-center border rounded-md p-2"
          >
            <Image
              src={product.image}
              alt={product.name}
              width={48}
              height={48}
              className="rounded object-contain w-12 h-12"
            />
            <div className="text-xs text-center">{product.name}</div>
            <div
              className="text-xs rounded px-2 mt-1 text-white"
              style={{ backgroundColor: product.color }}
            >
              {product.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
