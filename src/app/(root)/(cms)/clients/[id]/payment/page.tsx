import { Suspense } from "react";
import ClientPaymentPage from "@/components/cms/entities/fulfillment/client-payment-page";

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="p-6">טוען...</div>}>
      <ClientPaymentPage />
    </Suspense>
  );
}
