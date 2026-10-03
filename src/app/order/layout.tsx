import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fast & Secure Checkout",
  description: "Official 1-Tap Order & Delivery Confirmation",
};

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
