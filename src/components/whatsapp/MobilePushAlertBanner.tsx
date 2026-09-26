"use client";

import React, { useState, useEffect } from "react";
import { Bell, BellOff, BellRing, Smartphone, CheckCircle2, Download, Zap, RefreshCw, X } from "lucide-react";

interface MobilePushAlertBannerProps {
  context: "inbox" | "orders";
  compact?: boolean;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function MobilePushAlertBanner({ context, compact = false }: MobilePushAlertBannerProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check standalone mode (PWA installed)
    const isPWA = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    setIsStandalone(isPWA);

    // Capture PWA beforeinstallprompt
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Check service worker & push support
    if ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);

      // Ensure service worker is registered & sync existing subscription
      navigator.serviceWorker.register("/sw.js").then((registration) => {
        registration.pushManager.getSubscription().then(async (sub) => {
          if (sub) {
            setIsSubscribed(true);
            // Auto-sync subscription to server so DB always has it
            try {
              const rawSub = sub.toJSON();
              await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  endpoint: sub.endpoint,
                  p256dh: rawSub.keys?.p256dh,
                  auth: rawSub.keys?.auth
                })
              });
            } catch (_) {}
          } else {
            setIsSubscribed(false);
          }
        }).catch(() => {});
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  };

  const handleSubscribe = async () => {
    if (!isSupported) {
      showToast("Web Push is not supported on this browser version.", "error");
      return;
    }

    setSubscribing(true);
    try {
      // 1. Request Notification Permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        showToast("Notification permission was denied. Allow notifications in browser settings.", "error");
        setSubscribing(false);
        return;
      }

      // 2. Register Service Worker
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      // 3. Fetch VAPID Public Key from API
      let vapidKey = "BB-KZlpv_rpNWxWRhy0qmhKvmRPSD54y7BKlbA07xsuRbUlEbDLASekDIHTFgX-au3sAOSG4WJ5ZaHgk9tJ0HEg";
      try {
        const keyRes = await fetch("/api/push/subscribe");
        if (keyRes.ok) {
          const keyData = await keyRes.json();
          if (keyData?.vapidPublicKey) vapidKey = keyData.vapidPublicKey;
        }
      } catch (_) {}

      // 4. Subscribe with PushManager
      const convertedVapidKey = urlBase64ToUint8Array(vapidKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      // 5. Send subscription to backend
      const rawSub = subscription.toJSON();
      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: rawSub.keys?.p256dh,
          auth: rawSub.keys?.auth
        })
      });

      if (saveRes.ok) {
        setIsSubscribed(true);

        // Immediate confirmation notification on the device
        try {
          await (registration as any).showNotification("🎉 Alerts Activated!", {
            body: "Your phone is now connected! You will receive lock-screen alerts for new messages and orders.",
            icon: "/icon-192.png",
            badge: "/whatsapp-badge.png",
            vibrate: [200, 100, 200]
          } as any);
        } catch (_) {}

        showToast("🎉 Push Alerts Active! Your device will buzz for every incoming message & order.", "success");
      } else {
        showToast("Failed to save push subscription on server.", "error");
      }
    } catch (err: any) {
      console.error("[Push Subscribe Error]", err);
      showToast(err.message || "Failed to enable notifications.", "error");
    } finally {
      setSubscribing(false);
    }
  };

  const handleTestNotification = async () => {
    setTesting(true);
    const isOrder = context === "orders";
    try {
      let reg: ServiceWorkerRegistration | null = null;
      let currentSub: PushSubscription | null = null;

      if ("serviceWorker" in navigator) {
        try {
          reg = await navigator.serviceWorker.getRegistration() || await navigator.serviceWorker.register("/sw.js");
          if (reg) {
            currentSub = await reg.pushManager.getSubscription();
          }
        } catch (e) {
          console.warn("[SW reg check error]:", e);
        }
      }

      // 1. Instant local vibration & notification display directly via Service Worker
      if (reg && Notification.permission === "granted") {
        try {
          await (reg as any).showNotification(
            isOrder ? "🛍️ Test Order #ORD-9821 • ₹2,499" : "💬 Test Chat: Rahul Sharma (+91 98965 07407)",
            {
              body: isOrder
                ? "Priya Patel placed an order (2 items) via WhatsApp Catalog. Tap to fulfill."
                : "Hello! Can I order this item via Cash on Delivery? Please confirm.",
              icon: "/icon-192.png",
              badge: "/whatsapp-badge.png",
              tag: `test-buzz-${Date.now()}`,
              requireInteraction: isOrder,
              vibrate: isOrder ? [300, 100, 300, 100, 300] : [200, 100, 200],
              data: { url: isOrder ? "/whatsapp/orders" : "/whatsapp/inbox" }
            } as any
          );
        } catch (swErr) {
          console.warn("[Local SW Notification warning]", swErr);
        }
      }

      // 2. Dispatch real backend Web Push via server with current subscription attached
      const rawSub = currentSub ? currentSub.toJSON() : null;
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: context,
          subscription: currentSub ? {
            endpoint: currentSub.endpoint,
            keys: rawSub?.keys
          } : null
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setIsSubscribed(true);
        showToast(data.message || "🔔 Test buzz sent! Check your phone lock-screen / notification drawer.", "success");
      } else {
        showToast(data.error || "Failed to send server push.", "error");
      }
    } catch {
      showToast("Connection error sending test buzz.", "error");
    } finally {
      setTesting(false);
    }
  };

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    try {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsStandalone(true);
        setInstallPrompt(null);
        showToast("📱 App installed to home screen successfully!", "success");
      }
    } catch (e) {
      console.error("[Install PWA Error]", e);
    }
  };

  if (!isSupported || dismissed) return null;

  const isOrder = context === "orders";
  const titleText = isOrder
    ? "Real-time Order Alerts for Mobile & PC"
    : "Live WhatsApp Incoming Message Alerts";
  const descText = isOrder
    ? "Get a native lock-screen buzz on your phone whenever a customer places an order via WhatsApp or Shopify."
    : "Never miss a lead: Receive instant lock-screen notifications for every inbound customer message.";
  // ── Active State: ultra-compact single-line pill strip ──────────────
  if (permission === "granted" && isSubscribed) {
    return (
      <div className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 mb-1.5 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/40">
        {/* Pulsing dot + label */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-bold text-emerald-700 dark:text-emerald-400 text-[11px] shrink-0">Push Active:</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {isOrder ? "Order alerts on" : "Chats alert enabled"}
          </span>
        </div>
        {/* Test Buzz + dismiss */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleTestNotification}
            disabled={testing}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer disabled:opacity-60"
            title="Test notification"
          >
            {testing ? <RefreshCw size={9} className="animate-spin" /> : <Zap size={9} />}
            <span>Test Buzz</span>
          </button>
          <button onClick={() => setDismissed(true)} className="p-0.5 text-slate-400 hover:text-slate-600 rounded" title="Hide">
            <X size={12} />
          </button>
        </div>
        {toast && (
          <div className="fixed bottom-5 right-5 z-50 p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-bold shadow-2xl flex items-center gap-2">
            {toast.type === "success" ? <CheckCircle2 size={15} className="text-emerald-400" /> : <BellOff size={15} className="text-rose-400" />}
            <span>{toast.text}</span>
          </div>
        )}
      </div>
    );
  }

  // Permission Denied State
  if (permission === "denied") {
    return (
      <div className="w-full bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs mb-2 text-amber-800 dark:text-amber-300">
        <div className="flex items-center gap-2 min-w-0">
          <BellOff size={15} className="text-amber-500 shrink-0" />
          <span className="text-[11px] leading-tight">
            <strong>Alerts Blocked:</strong> Allow notifications in browser settings for lock-screen alerts.
          </span>
        </div>
        <button onClick={() => setDismissed(true)} className="text-slate-400 hover:text-slate-600 p-1 shrink-0">
          <X size={13} />
        </button>
      </div>
    );
  }

  // Not Enabled Banner (Permission: 'default' or not subscribed)
  return (
    <div className="w-full relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900/60 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900/80 border border-indigo-500/30 dark:border-emerald-500/30 p-3 mb-2.5 shadow-sm backdrop-blur-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 relative z-10">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 dark:bg-emerald-600/20 border border-indigo-500/30 dark:border-emerald-500/30 flex items-center justify-center shrink-0 text-indigo-400 dark:text-emerald-400">
            <Smartphone size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white tracking-tight">
                {titleText}
              </h4>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-500/20 dark:bg-emerald-500/20 text-indigo-300 dark:text-emerald-300 border border-indigo-500/30 dark:border-emerald-500/30 uppercase">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
              {descText}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end shrink-0 pt-1 sm:pt-0">
          {installPrompt && !isStandalone && (
            <button
              onClick={handleInstallApp}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition-all cursor-pointer shadow-xs"
            >
              <Download size={12} />
              <span>Install</span>
            </button>
          )}

          <button
            onClick={handleSubscribe}
            disabled={subscribing}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-emerald-600 dark:to-teal-600 hover:opacity-95 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {subscribing ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                <span>Enabling...</span>
              </>
            ) : (
              <>
                <BellRing size={12} />
                <span>Turn On Phone Alerts</span>
              </>
            )}
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
            title="Dismiss banner"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          {toast.type === "success" ? <CheckCircle2 size={15} className="text-emerald-400" /> : <BellOff size={15} className="text-rose-400" />}
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}
