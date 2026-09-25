// Service Worker for WhatMore & What-In PWA & Web Push Alerts
const CACHE_NAME = "wa-pwa-cache-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {
      title: "WhatsApp Alert",
      body: event.data ? event.data.text() : "New customer notification"
    };
  }

  const type = data.type || (data.data && data.data.type) || "inbox";
  const isOrder = type === "order";

  const defaultTitle = isOrder
    ? "🛍️ New Order Received!"
    : "💬 New WhatsApp Message";

  const title = data.title || defaultTitle;
  const targetUrl = data.url || (data.data && data.data.url) || (isOrder ? "/whatsapp/orders" : "/whatsapp/inbox");

  const actions = [];
  if (isOrder) {
    actions.push({ action: "view_order", title: "📦 View Order" });
    actions.push({ action: "dismiss", title: "Dismiss" });
  } else {
    actions.push({ action: "open_chat", title: "💬 Open Chat" });
    actions.push({ action: "dismiss", title: "Dismiss" });
  }

  const options = {
    body: data.body || (isOrder ? "A customer just placed a new order." : "You have an incoming WhatsApp customer message."),
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/whatsapp-badge.png",
    tag: data.tag || `wa-${type}-${Date.now()}`,
    renotify: true,
    requireInteraction: isOrder, // Keep order notification visible until acted upon
    vibrate: isOrder ? [300, 100, 300, 100, 300] : [200, 100, 200],
    data: {
      url: targetUrl,
      type: type,
      timestamp: Date.now()
    },
    actions: actions
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || "/whatsapp/inbox";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing window and navigate if available
      for (const client of clientList) {
        if ("focus" in client) {
          if (client.url && !client.url.includes(targetUrl)) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
