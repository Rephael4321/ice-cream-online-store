import ClientUnpaidOrders from "@/components/cms/entities/fulfillment/client-unpaid-orders";

type Props = {
  params: Promise<{ clientId: string }>;
};

export default async function ClientUnpaidPage({ params }: Props) {
  const { clientId: clientIdStr } = await params;
  const clientId = Number(clientIdStr);
  if (!Number.isInteger(clientId) || clientId < 1) {
    return (
      <div className="p-4" dir="rtl">
        <p className="text-red-600">מזהה לקוח לא תקין.</p>
      </div>
    );
  }
  return <ClientUnpaidOrders clientId={clientId} />;
}
