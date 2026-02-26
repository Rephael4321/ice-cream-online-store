"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Input, Label, showToast } from "@/components/cms/ui";
import { HeaderHydrator } from "@/components/cms/sections/header/section-header";
import { apiGet, apiPost } from "@/lib/api/client";

type PaymentMethod = "credit" | "paybox" | "cash";

export default function ClientPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = Number(params.id);
  const orderId = searchParams.get("orderId");

  const [clientName, setClientName] = useState<string | null>(null);
  const [unpaidTotal, setUnpaidTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!Number.isInteger(clientId) || clientId < 1) {
      setError("מזהה לקוח לא תקין");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGet(`/api/clients/${clientId}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch client");
        const data = await res.json();
        if (!cancelled) {
          setClientName(data.name ?? null);
          setUnpaidTotal(
            data.unpaidTotal != null ? Number(data.unpaidTotal) : 0
          );
          setAmount(
            data.unpaidTotal != null ? String(Number(data.unpaidTotal)) : "0"
          );
        }
      } catch {
        if (!cancelled) setError("תקלה בטעינת לקוח");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!Number.isFinite(num) || num < 0) {
      showToast("נא להזין סכום תקין (מספר אי-שלילי)", "warning");
      return;
    }
    if (num > unpaidTotal) {
      showToast(`הסכום לא יכול לעלות על חוב נוכחי (₪${unpaidTotal.toFixed(2)})`, "warning");
      return;
    }
    if (num === 0) {
      showToast("נא להזין סכום גדול מ־0", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiPost(`/api/clients/${clientId}/payments`, {
        amount: num,
        paymentMethod,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      showToast("✅ התשלום נרשם בהצלחה", "success");
      setUnpaidTotal(data.newUnpaidTotal ?? unpaidTotal - num);
      setAmount(data.newUnpaidTotal != null ? String(Number(data.newUnpaidTotal)) : "0");
      if (orderId) {
        router.push(`/orders/${orderId}`);
      }
    } catch {
      showToast("❌ שגיאה ברישום התשלום", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main dir="rtl" className="px-4 sm:px-6 md:px-10 max-w-2xl mx-auto py-6">
        <HeaderHydrator title="תשלום חוב" />
        <p>טוען...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main dir="rtl" className="px-4 sm:px-6 md:px-10 max-w-2xl mx-auto py-6">
        <HeaderHydrator title="תשלום חוב" />
        <p className="text-red-600">{error}</p>
        <Link href="/orders" className="text-blue-600 underline mt-2 inline-block">
          חזרה להזמנות
        </Link>
      </main>
    );
  }

  const maxAmount = Math.max(0, unpaidTotal);
  const amountNum = Number(amount);

  return (
    <main dir="rtl" className="px-4 sm:px-6 md:px-10 max-w-2xl mx-auto py-6">
      <HeaderHydrator title="תשלום חוב" />

      <div className="space-y-4 mb-6">
        <Link href="/orders" className="text-blue-600 hover:underline">
          ← חזרה להזמנות
        </Link>
        {orderId && (
          <span className="mr-4">
            <Link
              href={`/orders/${orderId}`}
              className="text-blue-600 hover:underline"
            >
              חזרה להזמנה #{orderId}
            </Link>
          </span>
        )}
      </div>

      <div className="border rounded-lg p-6 bg-amber-50 border-amber-200">
        <h1 className="text-xl font-bold text-amber-900 mb-2">
          תשלום חוב – {clientName ?? `לקוח #${clientId}`}
        </h1>
        <p className="font-semibold text-amber-800 mb-6">
          סה״כ חוב נוכחי: ₪{unpaidTotal.toFixed(2)}
        </p>

        {maxAmount <= 0 ? (
          <p className="text-amber-700">אין חוב לרישום תשלום.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="payment-amount">סכום לתשלום (₪)</Label>
              <Input
                id="payment-amount"
                type="number"
                min={0}
                max={maxAmount}
                step={0.01}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                dir="ltr"
                className="max-w-[160px] mt-1"
                placeholder="0"
              />
              <p className="text-sm text-amber-700 mt-1">
                מקסימום: ₪{maxAmount.toFixed(2)}
              </p>
            </div>

            <div>
              <Label htmlFor="payment-method">אמצעי תשלום</Label>
              <select
                id="payment-method"
                dir="rtl"
                className="mt-1 block w-full max-w-[200px] border rounded px-3 py-2"
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as PaymentMethod)
                }
              >
                <option value="cash">מזומן</option>
                <option value="credit">אשראי</option>
                <option value="paybox">פייבוקס</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "מעדכן..." : "עדכן"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (orderId) router.push(`/orders/${orderId}`);
                  else router.push("/orders");
                }}
              >
                ביטול
              </Button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
