import webpush from "web-push";

let configured = false;
let missingLogged = false;

export function isVapidConfigured(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  return Boolean(pub && priv && subject);
}

export function getVapidPublicKey(): string | null {
  const pub = process.env.VAPID_PUBLIC_KEY?.trim();
  return pub || null;
}

export function ensureWebPushConfigured(): boolean {
  if (configured) return true;
  if (!isVapidConfigured()) {
    if (!missingLogged) {
      missingLogged = true;
      console.warn(
        "[push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT not set; push disabled"
      );
    }
    return false;
  }
  const subject = process.env.VAPID_SUBJECT!.trim();
  const publicKey = process.env.VAPID_PUBLIC_KEY!.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY!.trim();
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}
