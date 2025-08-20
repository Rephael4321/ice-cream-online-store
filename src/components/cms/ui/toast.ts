// components/ui/toast.ts
"use client";

import { toast } from "sonner";

export type ToastType = "success" | "error" | "info" | "warning" | "loading";

type Options = {
  description?: string;
  duration?: number;
};

export function showToast(
  message: string,
  type: ToastType = "success",
  opts: Options = {}
): string | number {
  const { description, duration } = opts;
  let id: string | number;

  // Loading (if available)
  if (type === "loading" && (toast as any).loading) {
    id = (toast as any).loading(message, {
      description,
      duration,
      action: {
        label: "✕",
        onClick: () => toast.dismiss(id),
      },
    });
    return id;
  }

  // Warning fallback (sonner may not have toast.warning in some versions)
  if (type === "warning" && !(toast as any).warning) {
    id = toast(message, {
      description,
      duration,
      icon: "⚠️",
      // Optional styling if you use Tailwind (safe to keep or remove)
      className: "bg-amber-50 border-amber-200 text-amber-900",
      action: {
        label: "✕",
        onClick: () => toast.dismiss(id),
      },
    });
    return id;
  }

  // success / error / info (and warning if supported by your sonner version)
  const fn =
    ((toast as any)[type] as
      | ((msg: string, o?: any) => string | number)
      | undefined) ?? toast;

  id = fn(message, {
    description,
    duration,
    action: {
      label: "✕",
      onClick: () => toast.dismiss(id),
    },
  });

  return id;
}

export function dismissToast(id?: string | number) {
  toast.dismiss(id);
}
