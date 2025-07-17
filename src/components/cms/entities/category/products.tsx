"use client";

import { useState } from "react";
import ViewProducts from "./ui/view-products";
import OrganizeProducts from "./ui/organize-products";
import { Button } from "@/components/cms/ui/button";

export default function ProductsByCategory({ id }: { id: string }) {
  const [mode, setMode] = useState<"view" | "organize">("view");

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">מוצרים בקטגוריה {id}</h1>
        <div className="space-x-2">
          <Button
            variant={mode === "view" ? "default" : "outline"}
            onClick={() => setMode("view")}
          >
            צפייה
          </Button>
          <Button
            variant={mode === "organize" ? "default" : "outline"}
            onClick={() => setMode("organize")}
          >
            סידור
          </Button>
        </div>
      </div>

      {mode === "view" ? (
        <ViewProducts id={id} />
      ) : (
        <OrganizeProducts id={id} />
      )}
    </div>
  );
}
