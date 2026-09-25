import React from "react";
import WhatsAppHeaderNav from "@/components/whatsapp/WhatsAppHeaderNav";
import PushNotificationInitializer from "@/components/whatsapp/PushNotificationInitializer";
import PaymentWarningBanner from "@/components/whatsapp/PaymentWarningBanner";

export const metadata = {
  title: "WhatsApp Business Automation + CRM Platform",
  description: "Unified WhatsApp Business Inbox, AI Automation, Chatbots & CRM Data Platform"
};

export default function WhatsAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxHeight: "100vh", width: "100%", overflow: "hidden" }}>
      <PaymentWarningBanner />
      <WhatsAppHeaderNav />
      <PushNotificationInitializer />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
        {children}
      </div>
    </div>
  );
}
