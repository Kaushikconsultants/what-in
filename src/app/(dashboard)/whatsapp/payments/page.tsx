"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import WhatsAppPaymentsManagementComponent from "@/components/whatsapp/WhatsAppPaymentsManagementComponent";

export default function WhatsAppPaymentsPage() {
  return (
    <div className="p-4 sm:p-8 w-full max-w-none flex flex-col gap-6">
      {/* Notice linking to Integrations Payment Gateways */}
      <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm text-indigo-900 dark:text-indigo-200 font-medium">
          <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>Payments & UPI verification is now organized under <strong>Integrations &rarr; Payments & Gateways</strong>.</span>
        </div>
        <Link
          href="/whatsapp/integrations?tab=payment"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
        >
          <span>Go to Integrations Tab</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Full Dark-Mode Native Payments & Verification Suite */}
      <WhatsAppPaymentsManagementComponent embedded={false} />
    </div>
  );
}
