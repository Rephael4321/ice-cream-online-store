// components/cms/entities/storage/view-areas.tsx
"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Input } from "@/components/cms/ui/input";
import { Button } from "@/components/cms/ui/button";
import { showToast } from "@/components/cms/ui/toast";
import { Trash2, GripVertical, Check } from "lucide-react";
import { HeaderHydrator } from "@/components/cms/sections/header/section-header";

type StorageArea = {
  id: number;
  name: string;
  sort_order: number;
};

export default function ViewStorageAreas() {
  const [areas, setAreas] = useState<StorageArea[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  useEffect(() => {
    fetchAreas();
  }, []);

  async function fetchAreas() {
    try {
      const res = await fetch("/api/storage/areas", { cache: "no-store" });
      const data = await res.json();
      setAreas(data.areas || []);
    } catch {
      showToast("❌ שגיאה בטעינת אזורים", "error");
    }
  }

  async function addArea() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/storage/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error || "Failed to add");
      }

      showToast("✅ אזור נוסף בהצלחה", "success");
      setName("");
      fetchAreas();
    } catch (e) {
      showToast("❌ שגיאה בהוספת אזור", "error");
    } finally {
      setLoading(false);
    }
  }

  async function deleteArea(id: number) {
    if (!confirm("האם אתה בטוח שברצונך למחוק את האזור?")) return;

    try {
      const res = await fetch(`/api/storage/areas/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setAreas((prev) => prev.filter((a) => a.id !== id));
      showToast("🗑️ האזור נמחק", "success");
    } catch {
      showToast("❌ שגיאה במחיקה", "error");
    }
  }

  async function updateOrder(newOrder: StorageArea[]) {
    try {
      const payload = newOrder.map((a, idx) => ({
        id: a.id,
        sort_order: idx, // server can also compute; send explicit for clarity
      }));
      const res = await fetch("/api/storage/areas/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areas: payload }),
      });
      if (!res.ok) throw new Error("Order update failed");
      showToast("✅ סדר עודכן", "success");
    } catch {
      showToast("❌ שגיאה בעדכון סדר", "error");
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = areas.findIndex((a) => a.id === active.id);
    const newIndex = areas.findIndex((a) => a.id === over.id);
    const reordered = arrayMove(areas, oldIndex, newIndex);
    setAreas(reordered);
    updateOrder(reordered);
  }

  function updateNameLocally(id: number, newName: string) {
    setAreas((prev) =>
      prev.map((a) => (a.id === id ? { ...a, name: newName } : a))
    );
  }

  async function saveNameChange(id: number, newName: string) {
    try {
      const res = await fetch("/api/storage/areas/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Same endpoint supports partial updates (name) on server
        body: JSON.stringify({ areas: [{ id, name: newName.trim() }] }),
      });
      if (!res.ok) throw new Error("Rename failed");
      showToast("✅ השם עודכן", "success");
    } catch {
      showToast("❌ שגיאה בעדכון שם", "error");
    }
  }

  return (
    <main
      dir="rtl"
      className="px-4 sm:px-6 md:px-10 max-w-3xl mx-auto relative"
    >
      <HeaderHydrator title="אזורי אחסון" />

      <div className="py-6 space-y-6">
        {/* Add area */}
        <div className="flex gap-2">
          <Input
            placeholder="שם האזור"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim() && !loading) addArea();
            }}
          />
          <Button onClick={addArea} disabled={loading || !name.trim()}>
            הוסף אזור
          </Button>
        </div>

        {/* Existing areas (DnD) */}
        <div className="pt-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={areas.map((a) => a.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2">
                {areas.map((a) => (
                  <SortableAreaItem
                    key={a.id}
                    area={a}
                    onRename={updateNameLocally}
                    onRenameSave={saveNameChange}
                    onDelete={deleteArea}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </main>
  );
}

function SortableAreaItem({
  area,
  onRename,
  onRenameSave,
  onDelete,
}: {
  area: StorageArea;
  onRename: (id: number, name: string) => void;
  onRenameSave: (id: number, name: string) => void;
  onDelete: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: area.id });

  const [originalName, setOriginalName] = useState(area.name);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasChanged = area.name !== originalName;

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex items-center justify-between gap-2 px-2 py-1 bg-white rounded border shadow-sm"
    >
      <div className="flex items-center gap-2 w-full">
        <span
          {...listeners}
          className="cursor-grab select-none text-gray-400 active:cursor-grabbing touch-none"
          title="גרור לשינוי סדר"
        >
          <GripVertical className="w-5 h-5" />
        </span>

        <input
          className="w-full bg-transparent border-b border-gray-300 focus:outline-none focus:border-purple-500 text-sm py-1"
          value={area.name}
          onChange={(e) => onRename(area.id, e.target.value)}
          onBlur={() => {
            if (hasChanged && area.name.trim()) {
              onRenameSave(area.id, area.name);
              setOriginalName(area.name);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && hasChanged && area.name.trim()) {
              onRenameSave(area.id, area.name);
              setOriginalName(area.name);
            }
          }}
          onTouchStart={(e) => e.stopPropagation()}
        />

        {hasChanged && area.name.trim() && (
          <Button
            size="icon"
            onClick={() => {
              onRenameSave(area.id, area.name);
              setOriginalName(area.name);
            }}
            className="text-green-600 hover:text-green-700"
            title="שמור שם"
          >
            <Check className="w-4 h-4" />
          </Button>
        )}
      </div>

      <Button
        variant="destructive"
        onClick={() => onDelete(area.id)}
        className="ml-2"
        title="מחק אזור"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </li>
  );
}
