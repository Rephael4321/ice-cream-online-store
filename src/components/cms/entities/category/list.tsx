"use client";

import { useState } from "react";
import ViewCategories from "./ui/view-categories";
import OrganizeCategories from "./ui/organize-categories";
import { Button } from "@/components/cms/ui/button";
import Link from "next/link";

export default function ListCategories() {
  const [mode, setMode] = useState<"view" | "organize">("view");

  return (
    <div className="px-4 sm:px-6 md:px-10 max-w-7xl mx-auto">
      <Link href="/cms" className="text-blue-600 hover:underline">
        ← חזרה לניהול
      </Link>
      <h1 className="text-2xl font-bold mb-4 text-purple-700 text-center">
        ניהול קטגוריות
      </h1>

      <div className="flex justify-center gap-4 mb-6">
        <Button
          variant={mode === "view" ? "default" : "outline"}
          onClick={() => setMode("view")}
        >
          תצוגה
        </Button>
        <Button
          variant={mode === "organize" ? "default" : "outline"}
          onClick={() => setMode("organize")}
        >
          ארגון
        </Button>
      </div>

      {mode === "view" ? <ViewCategories /> : <OrganizeCategories />}
    </div>
  );
}
