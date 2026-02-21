"use client";

import { useEffect } from "react";
import { Button, Label } from "@/components/cms/ui";

type Group = {
  id: number;
  name: string;
  price: number | null;
  quantity: number | null;
  sale_price: number | null;
};

type Item = {
  id: number;
  name: string;
  price: number | null;
  sale_quantity: number | null;
  sale_price: number | null;
};

export default function SaleGroupPriceConflictModal({
  group,
  items,
  nextPrice,
  nextSaleQty,
  nextSalePrice,
  busy,
  onClose,
  onDetach,
  onPropagate,
}: {
  group: Group;
  items: Item[];
  nextPrice: number | null;
  nextSaleQty: number | null;
  nextSalePrice: number | null;
  busy?: boolean;
  onClose: () => void;
  onDetach: () => Promise<void>;
  onPropagate: () => Promise<void>;
}) {
  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sale-group-conflict-title"
      onClick={onClose} // backdrop click closes
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()} // prevent closing when clicking content
      >
        <div className="mb-4">
          <h2 id="sale-group-conflict-title" className="text-xl font-semibold">
            המוצר שייך לקבוצת מבצע
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            אתה משנה מחיר/מבצע שנעולים לפי הקבוצה <b>{group.name}</b>. בחר איך
            להמשיך:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="rounded-xl border p-3">
            <Label className="block mb-2">ערכי קבוצה נוכחיים</Label>
            <ul className="text-sm">
              <li>
                מחיר יחידה: <b>{group.price ?? "—"}</b>
              </li>
              <li>
                חבילה: <b>{group.quantity ?? "—"}</b> ב־{" "}
                <b>{group.sale_price ?? "—"}</b>
              </li>
            </ul>
          </div>
          <div className="rounded-xl border p-3">
            <Label className="block mb-2">ערכים חדשים</Label>
            <ul className="text-sm">
              <li>
                מחיר יחידה: <b>{nextPrice ?? "—"}</b>
              </li>
              <li>
                חבילה: <b>{nextSaleQty ?? "—"}</b> ב־{" "}
                <b>{nextSalePrice ?? "—"}</b>
              </li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl border p-3 mb-4 max-h-64 overflow-auto">
          <Label className="block mb-2">מוצרים אחרים בקבוצה</Label>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-1 pr-2">שם</th>
                <th className="py-1 pr-2">מחיר</th>
                <th className="py-1 pr-2">כמות חבילה</th>
                <th className="py-1">מחיר חבילה</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t">
                  <td className="py-1 pr-2">{it.name}</td>
                  <td className="py-1 pr-2">{it.price ?? "—"}</td>
                  <td className="py-1 pr-2">{it.sale_quantity ?? "—"}</td>
                  <td className="py-1">{it.sale_price ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col md:flex-row gap-2 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            ביטול
          </Button>
          <Button variant="destructive" onClick={onDetach} disabled={busy}>
            הסר מהקבוצה ועדכן רק מוצר זה
          </Button>
          <Button onClick={onPropagate} disabled={busy}>
            השאר בקבוצה ועדכן את כולם + נתוני הקבוצה
          </Button>
        </div>
      </div>
    </div>
  );
}
