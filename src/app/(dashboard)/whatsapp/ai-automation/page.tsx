"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import WhatsAppAIAutomationComponent from "@/components/whatsapp/WhatsAppAIAutomationComponent";

export default function WhatsAppAIAutomationPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/whatsapp/integrations?tab=ai-automation");
  }, [router]);

  return <WhatsAppAIAutomationComponent />;
}
