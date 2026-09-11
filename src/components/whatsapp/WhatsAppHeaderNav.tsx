"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare, LayoutDashboard, Bot, ShoppingBag, Key, Activity, Box, GitBranch, FileCode, Zap, Bell
} from "lucide-react";
import "./WhatsAppHeaderNav.css";
import { getWhatsAppDashboardMetrics, syncSessionRoleAction } from "@/app/actions/whatsAppPlatformActions";

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

const subNavItems = [
  { name: "Dashboard", path: "/whatsapp/dashboard", icon: LayoutDashboard },
  { name: "Inbox", path: "/whatsapp/inbox", icon: MessageSquare },
  { name: "Shopify", path: "/whatsapp/shopify", icon: ShoppingBag },
  { name: "WhatsApp", path: "/whatsapp/templates", icon: Bot },
  { name: "Integrations", path: "/whatsapp/integrations", icon: Zap },
  { name: "Products & Prices", path: "/whatsapp/commerce", icon: Box },
  { name: "Settings", path: "/whatsapp/api-settings", icon: Key },
  { name: "Logs", path: "/whatsapp/logs", icon: Activity },
];

export default function WhatsAppHeaderNav() {
  const pathname = usePathname();
  const [accountInfo, setAccountInfo] = React.useState<any>({
    status: "NOT CONNECTED",
    phoneNumber: "Not Configured",
    isConnected: false
  });

  React.useEffect(() => {
    getWhatsAppDashboardMetrics().then((res) => {
      if (res.success && res.account) {
        setAccountInfo({
          status: res.account.status || "NOT CONNECTED",
          phoneNumber: res.account.phoneNumber || "Not Configured",
          isConnected: res.isConnected || false
        });
      }
    });
  }, []);

  const isItemActive = (path: string) => {
    if (path === "/whatsapp/inbox" && (pathname === "/whatsapp" || pathname === "/whatsapp/inbox")) {
      return true;
    }
    if (path === "/whatsapp/shopify") {
      return pathname.startsWith("/whatsapp/shopify");
    }
    if (path === "/whatsapp/templates") {
      return (
        pathname.startsWith("/whatsapp/templates") ||
        pathname.startsWith("/whatsapp/flows") ||
        pathname.startsWith("/whatsapp/chatbots") ||
        pathname.startsWith("/whatsapp/chatbot-builder") ||
        pathname.startsWith("/whatsapp/contacts")
      );
    }
    return pathname.startsWith(path);
  };

  const [userName, setUserName] = React.useState("");
  const [userRole, setUserRole] = React.useState("");
  React.useEffect(() => {
    try {
      const u = document.cookie.split(";").find(c => c.trim().startsWith("wm_user="));
      if (u) { 
        const v = decodeURIComponent(u.split("=")[1]); 
        const parsed = JSON.parse(v);
        setUserName(parsed.name || ""); 
        setUserRole(parsed.role || "");
        
        // Background sync to ensure role is up to date (e.g. if admin changed agent's role while logged in)
        syncSessionRoleAction().then((newRole) => {
          if (newRole && newRole !== parsed.role) {
            setUserRole(newRole);
          }
        });
      }
    } catch {}
  }, []);
  const handleTestNotification = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notification");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        let subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
        
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        const sub = subscription.toJSON();
        
        // Save it
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: sub.endpoint,
            p256dh: sub.keys?.p256dh,
            auth: sub.keys?.auth
          })
        });

        // Trigger test push
        await fetch("/api/push/send", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-internal-secret": "crm_internal_2026"
          },
          body: JSON.stringify({
            subscription: {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.keys?.p256dh, auth: sub.keys?.auth }
            },
            payload: JSON.stringify({
              title: "Test Notification",
              body: "Web Push Notifications are working!",
              data: { url: "/whatsapp/inbox" }
            })
          })
        });
      } catch (err) {
        console.error(err);
        alert("Failed to subscribe or test notifications. Check console.");
      }
    } else {
      alert("Notification permission denied.");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <header className="whatmore-header">
      <div className="whatmore-header-top">
        <div className="whatmore-brand">
          <div className="brand-logo">
            <ShoppingBag size={24} strokeWidth={2.5} />
          </div>
          <div className="brand-text">
            <h1>{typeof window !== "undefined" && (window.location.hostname.includes("what-in") || window.location.hostname.includes("whatin")) ? "What-In" : "Whatmore"}</h1>
            <p>WhatsApp Business Automation</p>
          </div>
        </div>
        
        <Link
          href="/whatsapp/integrations"
          className={`status-badge ${accountInfo.isConnected ? "active" : "inactive"}`}
        >
          <span className="pulse-dot"></span>
          <span>WhatsApp API: {accountInfo.status}</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "12px" }}>
          <button onClick={handleTestNotification} title="Test Notifications" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "50%", background: "rgba(99, 102, 241, 0.1)", color: "#6366f1", border: "none", cursor: "pointer" }}>
            <Bell size={16} />
          </button>
          {userName && <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>{userName}</span>}
          <button onClick={handleLogout} style={{ padding: "5px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", color: "#f87171", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Sign Out</button>
        </div>
      </div>

      <nav className="whatmore-nav">
        {subNavItems.map((item) => {
          if (userRole === "AGENT" && item.name !== "Inbox" && item.name !== "Settings") return null;
          const Icon = item.icon;
          const active = isItemActive(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`nav-item ${active ? "active" : ""} ${item.highlight ? "highlight" : ""}`}
            >
              <Icon size={16} />
              <span>{userRole === "AGENT" && item.name === "Settings" ? "My Profile" : item.name}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

