"use client";

import { ReactNode, useMemo } from "react";
import { usePathname } from "next/navigation";
import { CMS_SECTIONS, CMSSectionKey } from "@/components/cms/sections/config";
import {
  SectionHeaderProvider,
  SectionHeader,
  HeaderAction,
  HeaderHydrator,
} from "@/components/cms/sections/header/section-header";

export default function SectionScaffold({
  section,
  children,
}: {
  section: CMSSectionKey;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const cfg = CMS_SECTIONS[section];

  const actions = useMemo<HeaderAction[]>(
    () =>
      cfg.nav.map((n) => ({
        key: n.key,
        label: n.label,
        href: n.href,
        variant: pathname?.startsWith(n.href) ? "secondary" : "outline", // active highlight
      })),
    [cfg.nav, pathname]
  );

  return (
    <SectionHeaderProvider initialTitle={cfg.label} initialActions={actions}>
      <HeaderHydrator actions={actions} />
      <SectionHeader />
      <div>{children}</div>
    </SectionHeaderProvider>
  );
}
