export function buildNewOrderPushPayload(orderId: number): string {
  return JSON.stringify({
    title: "הזמנה חדשה",
    body: `הזמנה #${orderId}`,
    orderId,
    url: `/orders/${orderId}`,
  });
}
