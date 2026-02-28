// components/cms/entities/client/list.tsx
"use client";

import { memo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { List } from "react-window";
import { Button, Input, Label, showToast } from "@/components/cms/ui";
import { HeaderHydrator } from "@/components/cms/sections/header/section-header";
import { apiDelete, apiGet } from "@/lib/api/client";

type Client = {
  id: number;
  name: string;
  phone: string;
  address: string;
  createdAt: string;
  unpaidTotal?: number;
  unpaidCount?: number;
};

const DEBOUNCE_MS = 350;
const SEARCHING_MESSAGE_DELAY_MS = 2000;
const ROW_HEIGHT = 172;
const ROW_GAP = 16;
const ITEM_SIZE = ROW_HEIGHT + ROW_GAP;
const OVERSCAN_COUNT = 3;

type ClientRowProps = {
  index: number;
  style: React.CSSProperties;
  ariaAttributes: { "aria-posinset": number; "aria-setsize": number; role: string };
  clients: Client[];
  onCopy: (phone: string) => void;
  onDelete: (id: number) => void;
};

const ClientRow = memo(function ClientRow({
  index,
  style,
  ariaAttributes,
  clients,
  onCopy,
  onDelete,
}: ClientRowProps) {
  const client = clients[index];
  if (!client) return null;
  return (
    <div style={style} className="pr-0" {...ariaAttributes}>
      <div
        className="border rounded p-3 sm:p-4 shadow flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white"
        style={{ height: ROW_HEIGHT, minHeight: ROW_HEIGHT }}
      >
        <div className="space-y-1 min-w-0 flex-1 overflow-hidden">
          <p className="truncate">שם: {client.name}</p>
          <p className="truncate" title={client.address || undefined}>
            כתובת: {client.address || "—"}
          </p>
          <p>
            טלפון:{" "}
            <span
              className="underline text-blue-600 cursor-pointer"
              onClick={() => onCopy(client.phone)}
              title="העתק מספר"
            >
              {client.phone}
            </span>
          </p>
          <p className="text-sm text-gray-500">{client.createdAt}</p>
          <p
            className={
              client.unpaidTotal != null && client.unpaidTotal > 0
                ? "text-amber-700 font-medium"
                : "text-gray-600"
            }
          >
            חוב:{" "}
            {client.unpaidTotal != null
              ? `₪${Number(client.unpaidTotal).toFixed(2)}`
              : "—"}
            {client.unpaidCount != null && client.unpaidCount > 0 && (
              <span className="text-sm"> ({client.unpaidCount} הזמנות)</span>
            )}
          </p>
        </div>
        <div className="flex flex-row sm:flex-col gap-2 items-end flex-shrink-0 self-end sm:self-auto">
          <Link
            href={`/clients/${client.id}`}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
          >
            צפייה
          </Link>
          <Button variant="destructive" onClick={() => onDelete(client.id)}>
            מחק
          </Button>
        </div>
      </div>
    </div>
  );
});

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [showSearchingMessage, setShowSearchingMessage] = useState(false);
  const initialLoadDone = useRef(false);
  const searchingDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const listContainerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(500);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const el = listContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setListHeight(el.clientHeight);
    });
    ro.observe(el);
    setListHeight(el.clientHeight);
    return () => ro.disconnect();
  }, [loading, clients.length]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchClients = async (search: string) => {
    const isInitial = !initialLoadDone.current;
    if (isInitial) setLoading(true);
    else {
      setSearching(true);
      setShowSearchingMessage(false);
      if (searchingDelayRef.current) clearTimeout(searchingDelayRef.current);
      searchingDelayRef.current = setTimeout(() => {
        setShowSearchingMessage(true);
        searchingDelayRef.current = null;
      }, SEARCHING_MESSAGE_DELAY_MS);
    }
    try {
      const url =
        "/api/clients?withUnpaid=1" +
        (search ? `&search=${encodeURIComponent(search)}` : "");
      const res = await apiGet(url, { cache: "no-store" });
      const data = await res.json();

      const normalized: Client[] = (data.clients || data).map((c: any) => {
        const date = new Date(c.createdAt || c.created_at);
        return {
          id: c.id,
          name: c.name || "",
          phone: c.phone || "—",
          address: c.address || "",
          createdAt: !isNaN(date.getTime())
            ? date.toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })
            : c.createdAt || c.created_at,
          unpaidTotal: c.unpaidTotal != null ? Number(c.unpaidTotal) : 0,
          unpaidCount: c.unpaidCount != null ? Number(c.unpaidCount) : 0,
        };
      });

      setClients(normalized);
      initialLoadDone.current = true;
    } catch {
      showToast("❌ שגיאה בטעינת לקוחות", "error");
    } finally {
      if (searchingDelayRef.current) {
        clearTimeout(searchingDelayRef.current);
        searchingDelayRef.current = null;
      }
      setLoading(false);
      setSearching(false);
      setShowSearchingMessage(false);
    }
  };

  useEffect(() => {
    fetchClients(debouncedSearch);
  }, [debouncedSearch]);

  const handleCopy = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      showToast("📋 מספר הועתק", "success");
    } catch {
      showToast("❌ לא הצלחנו להעתיק", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("האם למחוק את הלקוח וכל ההזמנות?")) return;

    try {
      const res = await apiDelete(`/api/clients/${id}`);
      if (!res.ok) throw new Error();
      setClients((prev) => prev.filter((c) => c.id !== id));
      showToast("🗑️ לקוח נמחק", "success");
    } catch {
      showToast("❌ תקלה במחיקה", "error");
    }
  };

  return (
    <main
      dir="rtl"
      className="h-full flex flex-col overflow-hidden w-full max-w-full mx-auto relative"
    >
      {/* Shared header title for the section layout */}
      <HeaderHydrator title="לקוחות" />

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden py-4 space-y-4">
        {/* Filters: collapsible on mobile, inline on sm+ */}
        <div className="flex flex-col flex-shrink-0 gap-2">
          <div className="flex sm:hidden items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
            >
              {filtersOpen ? "סגור חיפוש ▲" : "חיפוש ▼"}
            </Button>
            {!filtersOpen && searchQuery.trim() && (
              <span className="text-sm text-gray-500 truncate">חיפוש פעיל</span>
            )}
          </div>
          <div
            className={
              filtersOpen
                ? "flex flex-wrap items-center gap-2"
                : "hidden sm:flex flex-wrap items-center gap-2"
            }
          >
            <div>
              <Label htmlFor="client-search">חיפוש</Label>
              <Input
                id="client-search"
                type="search"
                placeholder="חפש לפי שם, טלפון או כתובת"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                dir="auto"
                className="max-w-md"
              />
            </div>
            {showSearchingMessage && (
              <span className="text-sm text-gray-500 self-end pb-2">מחפש...</span>
            )}
          </div>
        </div>

        {loading ? (
          <p>טוען לקוחות...</p>
        ) : clients.length === 0 ? (
          debouncedSearch ? (
            <p>לא נמצאו תוצאות עבור &quot;{debouncedSearch}&quot;.</p>
          ) : (
            <p>אין לקוחות להצגה.</p>
          )
        ) : (
          <div
            ref={listContainerRef}
            dir="rtl"
            className="flex-1 min-h-0"
          >
            <List
              rowComponent={ClientRow}
              rowCount={clients.length}
              rowHeight={ITEM_SIZE}
              rowProps={{
                clients,
                onCopy: handleCopy,
                onDelete: handleDelete,
              }}
              overscanCount={OVERSCAN_COUNT}
              defaultHeight={500}
              style={{ height: listHeight, width: "100%" }}
              dir="rtl"
            />
          </div>
        )}
      </div>
    </main>
  );
}
