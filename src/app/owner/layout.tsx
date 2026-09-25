import React from "react";
import OwnerHeaderNav from "@/components/owner/OwnerHeaderNav";

export const metadata = {
  title: "WhatMore Super-Admin Console",
  description: "Executive Multi-Tenant Operations & Feature Gating Platform",
};

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      <OwnerHeaderNav />
      <div className="w-full">
        {children}
      </div>
    </div>
  );
}
