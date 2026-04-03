export type PushSubscriptionRow = {
  id: number;
  userId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export function rowToWebPushSubscription(row: PushSubscriptionRow) {
  return {
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
  };
}
