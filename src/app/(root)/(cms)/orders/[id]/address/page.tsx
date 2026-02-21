"use client";

import { useParams } from "next/navigation";
import OrderAddressForm from "@/components/cms/entities/fulfillment/order-address-form";

export default function OrderAddressPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id ? String(params.id) : "";
  return <OrderAddressForm orderId={orderId} />;
}
