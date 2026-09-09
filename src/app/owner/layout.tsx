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
    <div style={{ margin: 0, fontFamily: "Inter, -apple-system, sans-serif", background: "#f8fafc", color: "#0f172a", minHeight: "100vh" }}>
      {children}
    </div>
  );
}
