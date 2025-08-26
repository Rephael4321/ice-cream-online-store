"use client";
import SectionScaffold from "@/components/cms/sections/scaffold/section-scaffold";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <SectionScaffold section="saleGroups">{children}</SectionScaffold>;
}
