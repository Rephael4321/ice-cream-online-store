"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, showToast } from "@/components/cms/ui";
import { api, apiGet, apiPost } from "@/lib/api/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationsPage() {
  const [vapidReady, setVapidReady] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [perm, setPerm] =
    useState<NotificationPermission>("default");
  const [hasPushSubscription, setHasPushSubscription] = useState(false);

  const refreshLocalSubscription = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setHasPushSubscription(false);
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    setHasPushSubscription(!!sub);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPerm(Notification.permission);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet("/api/push/vapid-public-key", {
          cache: "no-store",
        });
        const data = await res.json();
        if (!cancelled) {
          setVapidReady(res.ok && data.configured === true && !!data.publicKey);
        }
      } catch {
        if (!cancelled) setVapidReady(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void refreshLocalSubscription();
  }, [refreshLocalSubscription]);

  const enableNotifications = async () => {
    if (busy) return;
    if (!vapidReady) {
      showToast("התראות דחיפה לא מוגדרות בשרת", "error");
      return;
    }
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      showToast("הדפדפן לא תומך בהתראות", "error");
      return;
    }

    setBusy(true);
    try {
      const p = await Notification.requestPermission();
      setPerm(p);
      if (p !== "granted") {
        showToast("הרשאת התראות נדחתה", "error");
        return;
      }

      const keyRes = await apiGet("/api/push/vapid-public-key", {
        cache: "no-store",
      });
      const keyData = await keyRes.json();
      if (!keyRes.ok || !keyData.publicKey) {
        showToast("לא ניתן לטעון מפתח התראות", "error");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });

      const j = sub.toJSON();
      const saveRes = await apiPost("/api/push/subscribe", {
        endpoint: j.endpoint,
        keys: j.keys,
      });
      if (!saveRes.ok) {
        showToast("שמירת המנוי נכשלה", "error");
        return;
      }

      showToast("התראות הופעלו", "success");
      await refreshLocalSubscription();
    } catch (e) {
      console.error(e);
      showToast("שגיאה בהפעלת התראות", "error");
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await apiPost("/api/push/test", {});
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(
          typeof data.error === "string" ? data.error : "שליחת בדיקה נכשלה",
          "error"
        );
        return;
      }
      showToast("נשלחה התראת בדיקה", "success");
    } catch {
      showToast("שליחת בדיקה נכשלה", "error");
    } finally {
      setBusy(false);
    }
  };

  const disableNotifications = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const j = sub.toJSON();
        await api("/api/push/subscribe", {
          method: "DELETE",
          body: j.endpoint ? { endpoint: j.endpoint } : {},
        });
        await sub.unsubscribe();
      } else {
        await api("/api/push/subscribe", { method: "DELETE", body: {} });
      }
      showToast("התראות בוטלו במכשיר זה", "success");
      await refreshLocalSubscription();
    } catch (e) {
      console.error(e);
      showToast("שגיאה בביטול התראות", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main dir="rtl" className="max-w-2xl relative pb-10">
      <div className="py-6 space-y-6">
        <p className="text-gray-600 text-sm leading-relaxed">
          הפעל התראות כדי לקבל עדכון על הזמנות חדשות. יש להשאיר את האתר מותקן
          כאפליקציה (PWA) במכשירים ניידים כשהדפדפן דורש זאת.
        </p>

        <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4 space-y-2 text-sm">
          <div>
            <span className="text-gray-500">שרת VAPID: </span>
            {vapidReady === null ? (
              <span>בודק…</span>
            ) : vapidReady ? (
              <span className="text-green-700">מוכן</span>
            ) : (
              <span className="text-amber-700">
                לא מוגדר — הוסף VAPID_* ל־.env
              </span>
            )}
          </div>
          <div>
            <span className="text-gray-500">הרשאת דפדפן: </span>
            <span>{perm}</span>
          </div>
          <div>
            <span className="text-gray-500">מנוי במכשיר זה: </span>
            <span>{hasPushSubscription ? "כן" : "לא"}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            onClick={() => void enableNotifications()}
            disabled={busy || !vapidReady}
          >
            {busy ? "מעבד…" : "הפעל התראות"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void sendTest()}
            disabled={busy || !vapidReady}
          >
            שלח התראת בדיקה
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void disableNotifications()}
            disabled={busy}
          >
            בטל התראות במכשיר זה
          </Button>
        </div>
      </div>
    </main>
  );
}
