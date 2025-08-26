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
        // active page looks "secondary"
        variant: pathname?.startsWith(n.href) ? "secondary" : "outline",
      })),
    [cfg.nav, pathname]
  );

  return (
    <SectionHeaderProvider initialTitle={cfg.label} initialActions={actions}>
      {/* Header container: centered + a bit of top padding */}
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <HeaderHydrator actions={actions} />
        <SectionHeader />
      </div>

      {/* Content container: centered to match header */}
      <div className="mx-auto max-w-6xl px-4 pb-6">{children}</div>
    </SectionHeaderProvider>
  );
}
