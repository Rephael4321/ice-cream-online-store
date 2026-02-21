"use client";

import { useState } from "react";
import { Button } from "@/components/cms/ui";
import { HeaderHydrator } from "@/components/cms/sections/header/section-header";
import ViewCategories from "./ui/view-categories";
import OrganizeCategories from "./ui/organize-categories";

export default function ListCategories() {
  const [mode, setMode] = useState<"view" | "organize">("view");

  return (
    <div className="px-4 sm:px-6 md:px-10 max-w-7xl mx-auto space-y-4">
      {/* Shared header title (rendered by the section layout) */}
      <HeaderHydrator title="ניהול קטגוריות" />

      {/* Local controls */}
      <div className="flex justify-center gap-4">
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
