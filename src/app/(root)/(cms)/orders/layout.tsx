"use client";
import SectionScaffold from "@/components/cms/sections/scaffold/section-scaffold";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SectionScaffold section="orders">
      <div className="flex flex-col h-[calc(100dvh-12rem)] overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </div>
      </div>
    </SectionScaffold>
  );
}
