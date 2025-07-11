"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/cms/ui/input";
import { Label } from "@/components/cms/ui/label";
import { Button } from "@/components/cms/ui/button";
import { useParams, useRouter } from "next/navigation";

type Client = {
  id: number;
  name: string;
  phone: string;
  address: string;
  createdAt: string;
};

export default function ClientDetails() {
  const { id } = useParams();
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchClient() {
      try {
        const res = await fetch(`/api/clients/${id}`);
        if (!res.ok) throw new Error("Failed to fetch client");
        const data = await res.json();
        setClient({
          ...data,
          createdAt: new Date(data.created_at).toLocaleString("he-IL"),
        });
      } catch (err) {
        setError("תקלה בטעינת לקוח");
      } finally {
        setLoading(false);
      }
    }

    fetchClient();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!client) return;
    const { name, value } = e.target;
    setClient({ ...client, [name]: value });
  };

  const handleSave = async () => {
    if (!client) return;

    const { name, phone, address } = client;
    if (!name.trim() || !phone.trim() || !address.trim()) {
      alert("יש למלא את כל השדות");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, address }),
      });
      if (!res.ok) throw new Error("Failed to save");
      alert("נשמר בהצלחה");
    } catch {
      alert("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!client) return;
    if (!confirm("האם למחוק את הלקוח וכל ההזמנות?")) return;

    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      alert("נמחק בהצלחה");
      router.push("/clients");
    } catch {
      alert("שגיאה במחיקה");
    }
  };

  if (loading) return <p>טוען...</p>;
  if (error || !client) return <p>שגיאה בטעינה</p>;

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-6">📝 ערוך לקוח</h1>

      <div className="space-y-4">
        <div>
          <Label htmlFor="name">שם</Label>
          <Input name="name" value={client.name} onChange={handleChange} />
        </div>

        <div>
          <Label htmlFor="phone">טלפון</Label>
          <Input name="phone" value={client.phone} onChange={handleChange} />
        </div>

        <div>
          <Label htmlFor="address">כתובת</Label>
          <Input
            name="address"
            value={client.address}
            onChange={handleChange}
          />
        </div>

        <p className="text-sm text-gray-500">נוצר בתאריך: {client.createdAt}</p>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "שומר..." : "שמור"}
        </Button>

        <Button
          onClick={handleDelete}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          מחק לקוח
        </Button>
      </div>
    </div>
  );
}
