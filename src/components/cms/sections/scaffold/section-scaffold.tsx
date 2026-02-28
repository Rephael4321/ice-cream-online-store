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
      {/* Header container: centered; match content width for clients/orders */}
      <div
        className={
          section === "clients" || section === "orders"
            ? "mx-auto w-full px-4 sm:px-6 pt-4 max-w-6xl lg:max-w-7xl xl:max-w-[85rem] 2xl:max-w-[100rem]"
            : "mx-auto max-w-6xl px-4 pt-4"
        }
      >
        <HeaderHydrator actions={actions} />
        <SectionHeader />
      </div>

      {/* Content container: centered; clients/orders use wider max on desktop */}
      <div
        className={
          section === "clients" || section === "orders"
            ? "mx-auto w-full px-4 sm:px-6 pb-6 max-w-6xl lg:max-w-7xl xl:max-w-[85rem] 2xl:max-w-[100rem]"
            : "mx-auto max-w-6xl px-4 pb-6"
        }
      >
        {children}
      </div>
    </SectionHeaderProvider>
  );
}
