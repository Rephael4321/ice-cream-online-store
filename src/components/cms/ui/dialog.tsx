"use client";

import { useEffect, useRef } from "react";

type DialogProps = {
  /** When false, renders nothing */
  open: boolean;
  onClose: () => void;
  /** Optional id of the element that labels the dialog (for aria-labelledby) */
  titleId?: string;
  /** Additional class for the overlay (backdrop) */
  overlayClassName?: string;
  /** Additional class for the content panel (prevents backdrop click from closing when clicking inside) */
  contentClassName?: string;
  children: React.ReactNode;
};

/**
 * Shared modal dialog: overlay + content panel.
 * - role="dialog", aria-modal="true"
 * - Escape key closes
 * - Backdrop click closes; click inside content does not
 * - Focus moves to first focusable in content when opened
 */
export function Dialog({
  open,
  onClose,
  titleId,
  overlayClassName = "",
  contentClassName = "",
  children,
}: DialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !contentRef.current) return;
    const first = contentRef.current.querySelector<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])"
    );
    first?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3 ${overlayClassName}`.trim()}
      role="dialog"
      aria-modal="true"
      {...(titleId && { "aria-labelledby": titleId })}
      onClick={onClose}
    >
      <div
        ref={contentRef}
        className={`w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl ${contentClassName}`.trim()}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
