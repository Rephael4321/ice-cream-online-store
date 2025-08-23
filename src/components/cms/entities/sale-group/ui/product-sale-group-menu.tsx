"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/cms/ui/button";
import { Input } from "@/components/cms/ui/input";
import { showToast } from "@/components/cms/ui/toast";

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

  // menu visibility + position
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null
  );

  // data types
  type SaleGroupSummary = {
    id: number;
    name: string | null;
    image: string | null;
    price: number | null;
    sale_price: number | null;
    quantity: number | null;
  };
  type ApiSaleGroupList = { saleGroups?: SaleGroupSummary[] };
  type ApiSaleGroupItemsEntry = { id: number };

  const [saleGroups, setSaleGroups] = useState<SaleGroupSummary[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [loadingMembership, setLoadingMembership] = useState(false);

  // create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupImage, setNewGroupImage] = useState("");

  // ---------- helpers ----------
  async function safeJson<T = unknown>(res: Response): Promise<T | null> {
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return null;
    try {
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  async function ensureSaleGroups() {
    if (saleGroups.length || loadingGroups) return;
    setLoadingGroups(true);
    try {
      const res = await fetch("/api/sale-groups", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as ApiSaleGroupList;
      setSaleGroups(Array.isArray(data.saleGroups) ? data.saleGroups : []);
    } catch {
      showToast("שגיאה בטעינת קבוצות מבצע", "error");
    } finally {
      setLoadingGroups(false);
    }
  }

  async function loadMembership() {
    setLoadingMembership(true);
    try {
      await ensureSaleGroups();
      let groups = saleGroups;
      if (!groups.length) {
        const res = await fetch("/api/sale-groups", { cache: "no-store" });
        const data = (await res.json()) as ApiSaleGroupList;
        groups = Array.isArray(data.saleGroups) ? data.saleGroups : [];
        setSaleGroups(groups);
      }
      // scan to find current membership
      let current: number | null = null;
      const queue = [...groups];
      const workers = Math.min(6, queue.length);
      async function worker() {
        while (queue.length) {
          const g = queue.shift()!;
          try {
            const res = await fetch(`/api/sale-groups/${g.id}/items`, {
              cache: "no-store",
            });
            if (!res.ok) continue;
            const arr = (await res.json()) as ApiSaleGroupItemsEntry[];
            if (Array.isArray(arr) && arr.some((p) => p.id === productId)) {
              current = g.id;
            }
          } catch {}
        }
      }
      await Promise.all(Array.from({ length: workers }, () => worker()));
      setSelectedGroupId(current);
    } finally {
      setLoadingMembership(false);
    }
  }

  async function addToGroup(groupId: number) {
    const res = await fetch(`/api/sale-groups/${groupId}/items/${productId}`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await safeJson<{ error?: string }>(res);
      throw new Error(err?.error || "שגיאה בהוספה לקבוצת מבצע");
    }
  }

  async function removeFromGroup(groupId: number) {
    const res = await fetch(`/api/sale-groups/${groupId}/items/${productId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await safeJson<{ error?: string }>(res);
      throw new Error(err?.error || "שגיאה בהסרה מקבוצת מבצע");
    }
  }

  async function toggleGroup(groupId: number) {
    const prev = selectedGroupId;
    try {
      if (prev === groupId) {
        setSelectedGroupId(null);
        await removeFromGroup(groupId);
        showToast("🗑️ הוסר מקבוצת המבצע", "success");
      } else {
        setSelectedGroupId(groupId);
        if (prev != null) await removeFromGroup(prev);
        await addToGroup(groupId);
        showToast("✔️ המוצר נוסף לקבוצת המבצע", "success");
      }
    } catch (e: any) {
      setSelectedGroupId(prev);
      showToast(e?.message || "שגיאה בשינוי קבוצת המבצע", "error");
    }
  }

  // ---------- positioning ----------
  function measureAndSet() {
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = { top: rect.bottom + 6, left: Math.max(8, rect.right - 256) };
    setMenuPos((prev) => {
      if (!prev || prev.top !== next.top || prev.left !== next.left)
        return next;
      return prev;
    });
  }

  const openMenu = () => {
    // announce to other instances so they close themselves
    BUS.dispatchEvent(new CustomEvent("sg:open", { detail: { productId } }));
    measureAndSet();
    setOpen(true);
    void loadMembership();
    void ensureSaleGroups();
  };

  const closeMenu = () => {
    setOpen(false);
    setMenuPos(null);
  };

  // keep position updated while open (hover scale/scroll/resize)
  useEffect(() => {
    if (!open) return;

    let raf = 0;
    const loop = () => {
      measureAndSet();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onScroll = () => measureAndSet();
    const onResize = () => measureAndSet();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  // click-away (close if click is outside menu, button, and modal)
  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest?.("[data-sg-menu]")) return;
      if (target.closest?.("[data-sg-menu-button]")) return;
      if (target.closest?.("[data-sg-modal]")) return;
      if (open) closeMenu();
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  // listen for other menus opening and close this one if it's not for me
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ productId: number }>).detail;
      if (!detail) return;
      if (detail.productId !== productId && open) {
        closeMenu();
      }
    };
    BUS.addEventListener("sg:open", handler as EventListener);
    return () => BUS.removeEventListener("sg:open", handler as EventListener);
  }, [open, productId]);

  // ---------- create ----------
  async function handleCreateAndAdd() {
    setCreating(true);
    try {
      const body: { name: string | null; image?: string } = {
        name: newGroupName.trim() || null,
      };
      if (newGroupImage.trim()) body.image = newGroupImage.trim();

      const res = await fetch("/api/sale-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await safeJson<{ id?: number; error?: string }>(res);
      if (!res.ok || !data?.id) {
        throw new Error(data?.error || "יצירת קבוצת המבצע נכשלה");
      }

      await addToGroup(data.id);
      setSelectedGroupId(data.id);
      setSaleGroups((prev) => [
        {
          id: data.id!,
          name: newGroupName || null,
          image: body.image ?? null,
          price: null,
          sale_price: null,
          quantity: null,
        },
        ...prev,
      ]);

      setCreateOpen(false);
      setNewGroupName("");
      setNewGroupImage("");
      showToast("✔️ נוצרה קבוצה והפריט נוסף", "success");
    } catch (e: any) {
      showToast(e?.message || "שגיאה ביצירת קבוצה", "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      {/* Trigger button on OUTER card (not scaled) */}
      <button
        ref={btnRef}
        data-sg-menu-button
        className="absolute top-2 right-2 z-20 inline-flex h-8 w-8 items-center justify-center rounded-md border bg-white shadow hover:bg-gray-50"
        title="אפשרויות קבוצת מבצע"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          open ? closeMenu() : openMenu();
        }}
      >
        ⋯
      </button>

      {/* Floating list */}
      {open && menuPos && (
        <div
          className="fixed z-[1000]"
          style={{ top: menuPos.top, left: menuPos.left, width: 256 }}
          data-sg-menu
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-64 rounded-md border bg-white shadow-xl">
            <div className="px-3 py-2 border-b text-sm text-gray-600">
              קישור לקבוצת מבצע
            </div>

            {loadingMembership || loadingGroups ? (
              <div className="px-3 py-4 text-center text-gray-600">טוען…</div>
            ) : saleGroups.length === 0 ? (
              <div className="px-3 py-4 text-center text-gray-600">
                אין קבוצות מבצע קיימות
              </div>
            ) : (
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
                      >
                        <div className="truncate">
                          {g.name || "קבוצה ללא שם"}
                        </div>
                        <span
                          className={`ml-3 text-lg leading-none ${
                            selected ? "text-emerald-600" : "text-transparent"
                          }`}
                          aria-hidden
                        >
                          ✓
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="border-t px-3 py-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setOpen(false);
                  setMenuPos(null);
                  setCreateOpen(true);
                }}
              >
                צור קבוצה חדשה + הוסף
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {createOpen && (
        <div className="fixed inset-0 z-[1100]" data-sg-modal>
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setCreateOpen(false)}
          />
          <div className="absolute inset-x-0 top-16 mx-auto max-w-lg bg-white rounded-lg shadow-2xl border">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-semibold">קבוצת מבצע חדשה</div>
              <button
                className="text-sm text-gray-500 hover:text-gray-800"
                onClick={() => setCreateOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              <label className="block text-sm">שם (רשות)</label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />

              <label className="block text-sm">
                תמונת קבוצה (קישור מלא, רשות)
              </label>
              <Input
                value={newGroupImage}
                onChange={(e) => setNewGroupImage(e.target.value)}
                placeholder="https://…/image.jpg"
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setCreateOpen(false)}
                  disabled={creating}
                >
                  ביטול
                </Button>
                <Button onClick={handleCreateAndAdd} disabled={creating}>
                  {creating ? "יוצר…" : "צור והוסף"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
