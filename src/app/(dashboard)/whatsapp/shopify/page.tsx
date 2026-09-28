import React from "react";
import ShopifyHubComponent from "@/components/whatsapp/ShopifyHubComponent";
import ModuleGatedView from "@/components/whatsapp/ModuleGatedView";

export const metadata = {
  title: "Shopify E-Commerce WhatsApp Hub | Whatmore",
  description: "Live Shopify Orders, Abandoned Checkout Recovery, Pre-Generated WhatsApp Automation Flows, and COD-to-Prepaid Conversion."
};

export default function ShopifyPage() {
  return (
    <ModuleGatedView moduleKey="SHOPIFY_INTEGRATION">
      <ShopifyHubComponent />
    </ModuleGatedView>
  );
}
