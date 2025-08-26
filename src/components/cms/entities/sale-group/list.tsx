"use client";

import { useEffect, useState } from "react";
import { SaleGroupCard } from "./ui/sale-group-card";
import { showToast } from "@/components/cms/ui/toast";
import { Button } from "@/components/cms/ui/button";
import Link from "next/link";
import { HeaderHydrator } from "@/components/cms/sections/header/section-header";

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
        const res = await fetch("/api/sale-groups", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setGroups(Array.isArray(data.saleGroups) ? data.saleGroups : []);
      } catch {
        showToast("שגיאה בטעינת קבוצות מבצע", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, []);

  return (
    <main dir="rtl" className="px-4 sm:px-6 md:px-10 max-w-7xl mx-auto">
      <HeaderHydrator title="קבוצות מבצע" />

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
    </main>
  );
}
