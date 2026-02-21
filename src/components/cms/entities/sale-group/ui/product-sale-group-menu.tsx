"use client";

import { useEffect, useRef, useState } from "react";
import { showToast } from "@/components/cms/ui/toast";
import { apiDelete, apiGet, apiPost } from "@/lib/api/client";

type SaleGroupSummary = {
  id: number;
  name: string | null;
  price?: number | null;
  sale_price?: number | null;
  quantity?: number | null;
};
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
  initialGroupId = null,
  onChange,
}: {
  productId: number;
  initialGroupId?: number | null;
  onChange?: (
    newGroupId: number | null,
    meta?: {
      name?: string | null;
      price?: number | null;
      sale_price?: number | null;
      quantity?: number | null;
    }
  ) => void;
}) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null
  );

  const [saleGroups, setSaleGroups] = useState<SaleGroupSummary[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(
    initialGroupId ?? null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // keep selection synced if parent updates initialGroupId
    setSelectedGroupId(initialGroupId ?? null);
  }, [initialGroupId]);

  async function ensureSaleGroups() {
    if (saleGroups.length) return;
    try {
      const res = await apiGet("/api/sale-groups", { cache: "no-store" });
      const data = (await res.json()) as ApiSaleGroupList;
      // If your /api/sale-groups can return name/price/sale_price/quantity — great.
      // If not, we still at least get id/name for the menu.
      setSaleGroups(Array.isArray(data.saleGroups) ? data.saleGroups : []);
    } catch {
      showToast("שגיאה בטעינת קבוצות מבצע", "error");
    }
  }

  async function toggleGroup(groupId: number) {
    setLoading(true);
    const prev = selectedGroupId;
    try {
      if (prev === groupId) {
        // remove
        const res = await apiDelete(
          `/api/sale-groups/${groupId}/items/${productId}`
        );
        if (!res.ok) throw new Error();
        setSelectedGroupId(null);
        onChange?.(null);
        showToast("🗑️ הוסר מקבוצת המבצע", "success");
      } else {
        // add (optionally the server may reject if not compatible)
        const res = await apiPost(
          `/api/sale-groups/${groupId}/items/${productId}`
        );
        if (!res.ok) {
          const err = await safeJson<{ error?: string }>(res);
          throw new Error(err?.error || "שגיאה בהוספה לקבוצת מבצע");
        }
        setSelectedGroupId(groupId);
        const meta = saleGroups.find((g) => g.id === groupId);
        onChange?.(groupId, {
          name: meta?.name ?? null,
          price: meta?.price ?? null,
          sale_price: meta?.sale_price ?? null,
          quantity: meta?.quantity ?? null,
        });
        showToast("✔️ המוצר נוסף לקבוצת המבצע", "success");
      }
    } catch (e: any) {
      setSelectedGroupId(prev);
      showToast(e?.message || "שגיאה בשינוי קבוצת המבצע", "error");
    } finally {
      setLoading(false);
    }
  }

  async function safeJson<T = unknown>(res: Response): Promise<T | null> {
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return null;
    try {
      return (await res.json()) as T;
    } catch {
      return null;
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
    BUS.dispatchEvent(new CustomEvent("sg:open", { detail: { productId } }));
    setOpen(true);
    measureAndSet();
    ensureSaleGroups();
  };

  // close on outside click
  useEffect(() => {
    if (!open) return;

    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (t.closest?.("[data-sg-menu-button]")) return;
      if (t.closest?.("[data-sg-menu]")) return;
      closeMenu();
    }
    function onScrollOrResize() {
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

  // single-menu policy
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
                    title={g.name || `קבוצה #${g.id}`}
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
