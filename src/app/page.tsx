import LandingPageClient from "@/components/landing/LandingPageClient";
import { BRAND_WHATIN } from "@/lib/brandConfig";

export const metadata = {
  title: "What-In — Enterprise WhatsApp Business OS & AI Agent Platform",
  description: "Empower your brand with official Meta Cloud API v21.0, autonomous AI sales reps, Indian pincode & address auto-parsing, omnichannel multi-agent inbox, and real-time Shopify commerce sync.",
};

export default function HomePage() {
  return <LandingPageClient brandOverride={BRAND_WHATIN} />;
}
