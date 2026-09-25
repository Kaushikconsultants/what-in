import React from "react";
import WhatsAppHeaderNav from "@/components/whatsapp/WhatsAppHeaderNav";
import PushNotificationInitializer from "@/components/whatsapp/PushNotificationInitializer";
import PaymentWarningBanner from "@/components/whatsapp/PaymentWarningBanner";
import GlobalAnnouncementBanner from "@/components/whatsapp/GlobalAnnouncementBanner";

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
    <div className="wa-layout-root" style={{ display: "flex", flexDirection: "column", height: "100vh", maxHeight: "100vh", width: "100%", overflow: "hidden" }}>
      <GlobalAnnouncementBanner />
      <PaymentWarningBanner />
      <WhatsAppHeaderNav />
      <PushNotificationInitializer />
      <div className="wa-layout-content" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
        {children}
      </div>
    </div>
  );
}
