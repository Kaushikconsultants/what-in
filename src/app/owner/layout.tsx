import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";

const OWNER_SECRET = process.env.OWNER_PORTAL_SECRET || "whatin-owner-2026";

export const metadata = {
  title: "What-In Owner Console",
  description: "Super Admin portal for managing SaaS clients"
};

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ margin: 0, fontFamily: "Inter, -apple-system, sans-serif", background: "#0a0a0f", color: "#e2e8f0", minHeight: "100vh" }}>
      {children}
    </div>
  );
}
