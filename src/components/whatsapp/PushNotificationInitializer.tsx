"use client";

import { useEffect } from "react";

// Public VAPID key
const VAPID_PUBLIC_KEY = "BB-KZlpv_rpNWxWRhy0qmhKvmRPSD54y7BKlbA07xsuRbUlEbDLASekDIHTFgX-au3sAOSG4WJ5ZaHgk9tJ0HEg";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationInitializer() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const registerPush = async () => {
      try {
        // 1. Register the service worker
        const registration = await navigator.serviceWorker.register("/sw.js");

        // 2. Check for existing subscription
        let subscription = await registration.pushManager.getSubscription();

        // 3. Subscribe if not yet subscribed AND permission is already granted
        if (!subscription && Notification.permission === "granted") {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          });
        }

        // 4. Send to server to ensure it is stored in DB
        if (subscription) {
          const sub = subscription.toJSON();
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              endpoint: sub.endpoint,
              p256dh: sub.keys?.p256dh,
              auth: sub.keys?.auth
            })
          });
          console.log("[Push] Successfully synced subscription for WhatsApp notifications");
        }
      } catch (err) {
        console.warn("[Push] Subscription sync note:", err);
      }
    };

    registerPush();
  }, []);

  return null; // Invisible component
}
