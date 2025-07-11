"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/cms/ui/button";

type Client = {
  id: number;
  name: string;
  phone: string;
  address: string;
  createdAt: string;
};

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    setLoading(true);
    const res = await fetch("/api/clients");
    const data = await res.json();

    const normalized = (data.clients || data).map((c: any) => ({
      id: c.id,
      name: c.name || "",
      phone: c.phone || "—",
      address: c.address || "",
      createdAt: new Date(c.created_at).toLocaleString("he-IL"),
    }));

    setClients(normalized);
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCopy = (phone: string) => {
    navigator.clipboard.writeText(phone);
    toast.success("📋 מספר הועתק");
  };

  const handleDelete = async (id: number) => {
    if (!confirm("האם למחוק את הלקוח וכל ההזמנות?")) return;

    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("✅ לקוח נמחק");
      setClients((prev) => prev.filter((c) => c.id !== id));
    } catch {
      toast.error("❌ תקלה במחיקה");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">👤 ניהול לקוחות</h1>

      {loading ? (
        <p>טוען לקוחות...</p>
      ) : clients.length === 0 ? (
        <p>אין לקוחות להצגה.</p>
      ) : (
        <ul className="space-y-4">
          {clients.map((client) => (
            <li
              key={client.id}
              className="border rounded p-4 shadow flex justify-between items-center"
            >
              <div>
                <p>שם: {client.name}</p>
                <p>כתובת: {client.address}</p>
                <p>
                  טלפון:{" "}
                  <span
                    className="underline text-blue-600 cursor-pointer"
                    onClick={() => handleCopy(client.phone)}
                  >
                    {client.phone}
                  </span>
                </p>
                <p className="text-sm text-gray-500">{client.createdAt}</p>
              </div>

              <div className="flex flex-col gap-2 items-end">
                <Link
                  href={`/clients/${client.id}`}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                >
                  צפייה
                </Link>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(client.id)}
                >
                  מחק
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
