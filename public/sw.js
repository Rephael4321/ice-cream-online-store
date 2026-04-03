self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());

self.addEventListener("push", (event) => {
  let data = { title: "המפנק", body: "", url: "/orders" };
  try {
    if (event.data) {
      const parsed = event.data.json();
      if (parsed && typeof parsed === "object") {
        if (typeof parsed.title === "string") data.title = parsed.title;
        if (typeof parsed.body === "string") data.body = parsed.body;
        if (typeof parsed.url === "string") data.url = parsed.url;
      }
    }
  } catch (_) {
    /* use defaults */
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body || undefined,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = event.notification.data && event.notification.data.url;
  const path = typeof raw === "string" && raw.startsWith("/") ? raw : "/orders";
  const fullUrl = new URL(path, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        try {
          if (new URL(client.url).origin === self.location.origin && "focus" in client) {
            if (typeof client.navigate === "function") {
              return client.navigate(fullUrl).then(() => client.focus());
            }
            return client.focus();
          }
        } catch (_) {
          /* continue */
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullUrl);
      }
    })
  );
});
