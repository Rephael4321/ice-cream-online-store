"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Label, Button, showToast } from "@/components/cms/ui";
import { HeaderHydrator } from "@/components/cms/sections/header/section-header";
import { AddressSearch, type SelectedPlace } from "@/components/address-search";
import { apiPost } from "@/lib/api/client";

export default function NewClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressLat, setAddressLat] = useState<number | null>(null);
  const [addressLng, setAddressLng] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const handlePlaceSelect = (place: SelectedPlace) => {
    setAddress(place.formattedAddress);
    setAddressLat(place.lat);
    setAddressLng(place.lng);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const phoneTrimmed = phone.trim();
    if (!phoneTrimmed) {
      showToast("נא להזין מספר טלפון", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await apiPost("/api/clients", {
        phone: phoneTrimmed,
        name: name.trim() || undefined,
        address: address.trim() || undefined,
        address_lat: addressLat ?? undefined,
        address_lng: addressLng ?? undefined,
      });

      if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "לקוח עם מספר טלפון זה כבר קיים", "error");
        setSaving(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "שגיאה ביצירת הלקוח");
      }

      const data = await res.json();
      const id = data?.id;
      showToast("✔ הלקוח נוצר בהצלחה", "success");

      if (typeof id === "number") {
        router.push(`/clients/${id}`);
      } else {
        router.push("/clients");
      }
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : "שגיאה ביצירת הלקוח", "error");
      setSaving(false);
    }
  };

  return (
    <main
      dir="rtl"
      className="px-4 sm:px-6 md:px-10 max-w-7xl mx-auto relative"
    >
      <HeaderHydrator title="לקוח חדש" />

      <div className="py-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="name">שם</Label>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              dir="auto"
            />
          </div>

          <div>
            <Label htmlFor="phone">טלפון</Label>
            <Input
              id="phone"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              dir="ltr"
            />
          </div>

          <div>
            <Label htmlFor="address">כתובת (טקסט)</Label>
            <Input
              id="address"
              name="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              dir="auto"
            />
          </div>

          <div>
            <Label className="block mb-1">או חפש ב-Google Maps</Label>
            <AddressSearch
              showWazeButton={false}
              onPlaceSelect={handlePlaceSelect}
            />
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "שומר..." : "צור לקוח"}
          </Button>
        </form>
      </div>
    </main>
  );
}
