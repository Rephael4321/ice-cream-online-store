"use client";

import { useEffect, useRef, useState } from "react";
import { showToast } from "@/components/cms/ui/toast";

type SaleGroupSummary = { id: number; name: string | null };
type ApiSaleGroupList = { saleGroups?: SaleGroupSummary[] };

/** Shared event bus so only one menu is open at a time */
function getBus(): EventTarget {
  if (typeof window === "undefined") return new EventTarget();
  const w = window as any;
  if (!w.__SG_MENU_BUS__) w.__SG_MENU_BUS__ = new EventTarget();
  return w.__SG_MENU_BUS__ as EventTarget;
}
const BUS = getBus();

export default function ProductSaleGroupMenu({
  productId,
}: {
  productId: number;
}) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null
  );

  const [saleGroups, setSaleGroups] = useState<SaleGroupSummary[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function ensureSaleGroups() {
    if (saleGroups.length) return;
    try {
      const res = await fetch("/api/sale-groups", { cache: "no-store" });
      const data = (await res.json()) as ApiSaleGroupList;
      setSaleGroups(Array.isArray(data.saleGroups) ? data.saleGroups : []);
    } catch {
      showToast("שגיאה בטעינת קבוצות מבצע", "error");
    }
  }

  async function loadMembership() {
    try {
      for (const g of saleGroups) {
        const res = await fetch(`/api/sale-groups/${g.id}/items`, {
          cache: "no-store",
        });
        if (!res.ok) continue;
        const arr = (await res.json()) as { id: number }[];
        if (arr.some((p) => p.id === productId)) {
          setSelectedGroupId(g.id);
          return;
        }
      }
      setSelectedGroupId(null);
    } catch {
      /* ignore */
    }
  }

  async function toggleGroup(groupId: number) {
    setLoading(true);
    const prev = selectedGroupId;
    try {
      if (prev === groupId) {
        await fetch(`/api/sale-groups/${groupId}/items/${productId}`, {
          method: "DELETE",
        });
        setSelectedGroupId(null);
        showToast("🗑️ הוסר מקבוצת המבצע", "success");
      } else {
        await fetch(`/api/sale-groups/${groupId}/items/${productId}`, {
          method: "POST",
        });
        setSelectedGroupId(groupId);
        showToast("✔️ המוצר נוסף לקבוצת המבצע", "success");
      }
    } catch {
      setSelectedGroupId(prev);
      showToast("שגיאה בשינוי קבוצת המבצע", "error");
    } finally {
      setLoading(false);
    }
  }

  function measureAndSet() {
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 6, left: Math.max(8, rect.right - 256) });
  }

  const closeMenu = () => {
    setOpen(false);
    setMenuPos(null);
  };

  const openMenu = () => {
    // tell others to close
    BUS.dispatchEvent(new CustomEvent("sg:open", { detail: { productId } }));
    setOpen(true);
    measureAndSet();
    ensureSaleGroups().then(loadMembership);
  };

  // close on outside click (anywhere not inside button or menu)
  useEffect(() => {
    if (!open) return;

    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (t.closest?.("[data-sg-menu-button]")) return;
      if (t.closest?.("[data-sg-menu]")) return;
      closeMenu();
    }

    function onScrollOrResize() {
      // keep position fresh while open
      measureAndSet();
    }

    document.addEventListener("mousedown", onDocMouseDown);
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  // close if another ProductSaleGroupMenu opens
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ productId: number }>).detail;
      if (!detail) return;
      if (detail.productId !== productId && open) closeMenu();
    };
    BUS.addEventListener("sg:open", handler as EventListener);
    return () => BUS.removeEventListener("sg:open", handler as EventListener);
  }, [open, productId]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        data-sg-menu-button
        className="absolute top-2 right-2 z-20 inline-flex h-8 w-8 items-center justify-center rounded-md border bg-white shadow hover:bg-gray-50"
        title="אפשרויות קבוצת מבצע"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
          if (!open) openMenu();
          else closeMenu();
        }}
      >
        ⋯
      </button>

      {open && menuPos && (
        <div
          ref={menuRef}
          data-sg-menu
          className="fixed z-50 w-64 rounded-md border bg-white shadow-xl"
          style={{ top: menuPos.top, left: menuPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b text-sm text-gray-600">
            קישור לקבוצת מבצע
          </div>
          <ul className="max-h-80 overflow-auto">
            {saleGroups.map((g) => {
              const selected = selectedGroupId === g.id;
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 ${
                      selected ? "bg-emerald-50" : ""
                    }`}
                    onClick={() => toggleGroup(g.id)}
                    disabled={loading}
                  >
                    <div className="truncate">{g.name || "קבוצה ללא שם"}</div>
                    <span
                      className={`ml-3 text-lg ${
                        selected ? "text-emerald-600" : "text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
