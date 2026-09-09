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
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%", width: "100%" }}>
      <PaymentWarningBanner />
      <WhatsAppHeaderNav />
      <PushNotificationInitializer />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}
