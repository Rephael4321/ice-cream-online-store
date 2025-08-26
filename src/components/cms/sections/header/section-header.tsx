"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode,
  useEffect,
} from "react";
import Link from "next/link";
import { Button } from "@/components/cms/ui/button";

export type HeaderAction =
  | {
      key: string;
      label: string;
      href: string;
      variant?: "default" | "outline" | "destructive" | "secondary";
      disabled?: boolean;
    }
  | {
      key: string;
      label: string;
      onClick: () => void;
      variant?: "default" | "outline" | "destructive" | "secondary";
      disabled?: boolean;
    };

export type HeaderState = { title: ReactNode; actions: HeaderAction[] };

type Ctx = {
  header: HeaderState;
  setHeader: (next: Partial<HeaderState>) => void;
};

const SectionHeaderContext = createContext<Ctx | null>(null);

export function SectionHeaderProvider({
  children,
  initialTitle,
  initialActions = [],
}: {
  children: ReactNode;
  initialTitle: ReactNode;
  initialActions?: HeaderAction[];
}) {
  const [header, setHeaderState] = useState<HeaderState>({
    title: initialTitle,
    actions: initialActions,
  });
  const setHeader = (next: Partial<HeaderState>) =>
    setHeaderState((prev) => ({ ...prev, ...next }));
  const value = useMemo(() => ({ header, setHeader }), [header]);
  return (
    <SectionHeaderContext.Provider value={value}>
      {children}
    </SectionHeaderContext.Provider>
  );
}

export function useSectionHeader() {
  const ctx = useContext(SectionHeaderContext);
  if (!ctx)
    throw new Error(
      "useSectionHeader must be used within SectionHeaderProvider"
    );
  return ctx;
}

export function SectionHeader() {
  const { header } = useSectionHeader();
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <h1 className="text-2xl font-semibold">{header.title}</h1>
      <div className="flex flex-wrap items-center gap-2">
        {header.actions.map((a) =>
          "href" in a ? (
            <Link href={a.href} key={a.key}>
              <Button variant={a.variant ?? "default"} disabled={a.disabled}>
                {a.label}
              </Button>
            </Link>
          ) : (
            <Button
              key={a.key}
              onClick={a.onClick}
              variant={a.variant ?? "default"}
              disabled={a.disabled}
            >
              {a.label}
            </Button>
          )
        )}
      </div>
    </div>
  );
}

/** Per-page helper: set/override header with a one-liner */
export function HeaderHydrator({
  title,
  actions,
}: {
  title?: ReactNode;
  actions?: HeaderAction[];
}) {
  const { setHeader } = useSectionHeader();
  useEffect(() => {
    const next: Partial<HeaderState> = {};
    if (title !== undefined) next.title = title;
    if (actions !== undefined) next.actions = actions;
    if (Object.keys(next).length) setHeader(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, JSON.stringify(actions)]);
  return null;
}
