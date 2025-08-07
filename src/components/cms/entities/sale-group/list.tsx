"use client";

import { useEffect, useState } from "react";
import { SaleGroupCard } from "./ui/sale-group-card";
import { showToast } from "@/components/cms/ui/toast";
import { Button } from "@/components/cms/ui/button";
import Link from "next/link";

type SaleGroup = {
  id: number;
  name: string | null;
  image: string | null;
  quantity: number | null;
  sale_price: number | null;
  price: number | null;
  created_at: string;
  updated_at: string;
};

export default function SaleGroupList() {
  const [groups, setGroups] = useState<SaleGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch("/api/sale-groups");
        if (!res.ok) throw new Error();

        const data = await res.json();
        setGroups(data.saleGroups);
      } catch (err) {
        showToast("שגיאה בטעינת קבוצות מבצע", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-purple-700">קבוצות מבצע</h1>
        <Link href="/sale-groups/new">
          <Button>קבוצה חדשה</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-center mt-8">טוען קבוצות מבצע...</p>
      ) : groups.length === 0 ? (
        <p className="text-center text-gray-600">אין קבוצות מבצע כרגע.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {groups.map((group) => (
            <SaleGroupCard
              key={group.id}
              id={group.id}
              name={group.name}
              image={group.image}
              quantity={group.quantity}
              salePrice={group.sale_price}
              price={group.price}
            />
          ))}
        </div>
      )}
    </div>
  );
}
