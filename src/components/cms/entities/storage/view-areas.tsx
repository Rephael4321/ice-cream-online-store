"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
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

type StorageArea = {
  id: number;
  name: string;
  sort_order: number;
};

export default function ViewStorageAreas() {
  const [areas, setAreas] = useState<StorageArea[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    fetchAreas();
  }, []);

  async function fetchAreas() {
    const res = await fetch("/api/storage/areas");
    const data = await res.json();
    setAreas(data.areas || []);
  }

  async function addArea() {
    setLoading(true);
    const res = await fetch("/api/storage/areas", {
      method: "POST",
      body: JSON.stringify({ name }),
    });

    if (res.ok) {
      showToast("אזור נוסף בהצלחה");
      setName("");
      fetchAreas();
    } else {
      const { error } = await res.json();
      showToast(error || "שגיאה בהוספת אזור", "error");
    }

    setLoading(false);
  }

  async function deleteArea(id: number) {
    const confirmed = confirm("האם אתה בטוח שברצונך למחוק את האזור?");
    if (!confirmed) return;

    const res = await fetch(`/api/storage/areas/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      showToast("האזור נמחק");
      setAreas((prev) => prev.filter((a) => a.id !== id));
    } else {
      showToast("שגיאה במחיקה", "error");
    }
  }

  async function updateOrder(newOrder: StorageArea[]) {
    const res = await fetch("/api/storage/areas/order", {
      method: "POST",
      body: JSON.stringify({ areas: newOrder }),
    });

    if (res.ok) {
      showToast("סדר עודכן");
    } else {
      showToast("שגיאה בעדכון סדר", "error");
    }
  }

  function handleDragEnd(event: any) {
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

  async function saveNameChange(id: number, name: string) {
    const res = await fetch("/api/storage/areas/order", {
      method: "POST",
      body: JSON.stringify({ areas: [{ id, name }] }),
    });

    if (res.ok) {
      showToast("השם עודכן");
    } else {
      showToast("שגיאה בעדכון שם", "error");
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-purple-700 text-center">
        ניהול אזורי אחסון
      </h1>

      <div className="space-y-3">
        <Input
          placeholder="שם האזור"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button onClick={addArea} disabled={loading}>
          הוסף אזור
        </Button>
      </div>

      <div className="pt-6 space-y-4">
        <h2 className="text-lg font-semibold">אזורי אחסון קיימים</h2>

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

  const style = {
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
          className="cursor-grab select-none text-gray-400"
          title="גרור לשינוי סדר"
        >
          <GripVertical className="w-5 h-5" />
        </span>

        <input
          className="w-full bg-transparent border-b border-gray-300 focus:outline-none focus:border-purple-500 text-sm py-1"
          value={area.name}
          onChange={(e) => onRename(area.id, e.target.value)}
          onBlur={() => {
            if (hasChanged) {
              onRenameSave(area.id, area.name);
              setOriginalName(area.name);
            }
          }}
        />

        {hasChanged && (
          <Button
            size="icon"
            onClick={() => {
              onRenameSave(area.id, area.name);
              setOriginalName(area.name);
            }}
            className="text-green-600 hover:text-green-700"
          >
            <Check className="w-4 h-4" />
          </Button>
        )}
      </div>

      <Button
        variant="destructive"
        onClick={() => onDelete(area.id)}
        className="ml-2"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </li>
  );
}
