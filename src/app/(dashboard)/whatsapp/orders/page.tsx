import React from "react";
import WhatsAppOrdersComponent from "@/components/whatsapp/WhatsAppOrdersComponent";

export const metadata = {
  title: "Orders & Fulfillment Panel | Whatmore",
  description: "Unified Shopify & WhatsApp Catalog Orders with address validation, Pincode auto-fill, and multi-tenant payment controls."
};

export default function WhatsAppOrdersPage() {
  return <WhatsAppOrdersComponent />;
}
