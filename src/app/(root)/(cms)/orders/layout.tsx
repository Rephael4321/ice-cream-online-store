"use client";
import SectionScaffold from "@/components/cms/sections/scaffold/section-scaffold";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SectionScaffold section="orders">
      <div className="flex flex-col h-[calc(100dvh-12rem)] overflow-hidden">
        {children}
      </div>
    </SectionScaffold>
  );
}
