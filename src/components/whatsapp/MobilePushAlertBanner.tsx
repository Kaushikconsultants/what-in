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

      // Check existing subscription
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        }).catch(() => {});
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
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
        showToast("Notification permission was denied. Enable alerts in your browser settings.", "error");
        setSubscribing(false);
        return;
      }

      // 2. Register Service Worker if not registered
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
        showToast("🎉 Push Alerts Active! Your phone will buzz for every incoming message & order.", "success");
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
    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: context })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(data.message || "🔔 Test buzz sent! Check your phone lock-screen / notification drawer.", "success");
      } else {
        showToast(data.error || "Failed to send test push.", "error");
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

  // Context-specific strings
  const isOrder = context === "orders";
  const titleText = isOrder
    ? "Real-time Order Alerts for Phone & Desktop"
    : "Live WhatsApp Incoming Message Alerts";
  const descText = isOrder
    ? "Get a native lock-screen buzz on your phone whenever a customer places an order via WhatsApp or Shopify."
    : "Never miss a lead: Receive instant push notifications on your phone lock-screen for every inbound customer message.";

  // Compact bar when already granted & subscribed
  if (permission === "granted" && isSubscribed) {
    return (
      <div className="w-full bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3.5 py-2 flex items-center justify-between gap-3 text-xs mb-3 text-slate-800 dark:text-slate-200 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">Mobile Push Active:</span>
          <span className="truncate text-slate-600 dark:text-slate-300">
            Lock-screen alerts enabled for {isOrder ? "New Orders" : "Inbox Chats"}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleTestNotification}
            disabled={testing}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer"
            title="Send sample notification to your device to verify it buzzes"
          >
            {testing ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
            <span>Test Buzz</span>
          </button>

          {installPrompt && !isStandalone && (
            <button
              onClick={handleInstallApp}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white border border-slate-700 transition-all cursor-pointer"
            >
              <Download size={12} />
              <span>Install App</span>
            </button>
          )}
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

  // Permission Denied State
  if (permission === "denied") {
    return (
      <div className="w-full bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs mb-3 text-amber-800 dark:text-amber-300">
        <div className="flex items-center gap-2">
          <BellOff size={16} className="text-amber-500 shrink-0" />
          <span>
            <strong>Alerts Blocked:</strong> Push notifications are blocked in your browser settings. Please allow notifications for this site to receive lock-screen order & chat buzzes.
          </span>
        </div>
        <button onClick={() => setDismissed(true)} className="text-slate-400 hover:text-slate-600 p-1">
          <X size={14} />
        </button>
      </div>
    );
  }

  // Not Enabled Banner (Permission: 'default' or not subscribed)
  return (
    <div className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900/60 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900/80 border border-indigo-500/30 dark:border-emerald-500/30 p-4 mb-4 shadow-lg backdrop-blur-md">
      {/* Decorative ambient background */}
      <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 rounded-full bg-indigo-500/10 dark:bg-emerald-500/10 blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 dark:bg-emerald-600/20 border border-indigo-500/30 dark:border-emerald-500/30 flex items-center justify-center shrink-0 text-indigo-400 dark:text-emerald-400 shadow-inner">
            <Smartphone size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
                {titleText}
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 dark:bg-emerald-500/20 text-indigo-300 dark:text-emerald-300 border border-indigo-500/30 dark:border-emerald-500/30 uppercase tracking-wider">
                PWA Active
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 max-w-xl">
              {descText}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0">
          {installPrompt && !isStandalone && (
            <button
              onClick={handleInstallApp}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Download size={14} />
              <span>Install PWA</span>
            </button>
          )}

          <button
            onClick={handleSubscribe}
            disabled={subscribing}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-emerald-600 dark:to-teal-600 hover:opacity-95 shadow-md shadow-indigo-500/20 dark:shadow-emerald-500/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {subscribing ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Enabling...</span>
              </>
            ) : (
              <>
                <BellRing size={14} />
                <span>Turn On Phone Alerts</span>
              </>
            )}
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors"
            title="Dismiss banner"
          >
            <X size={16} />
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
