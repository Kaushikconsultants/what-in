import { NextResponse } from "next/server";
import { getWhatsAppTemplates } from "@/app/actions/whatsAppPlatformActions";

export async function GET() {
  try {
    const result = await getWhatsAppTemplates();
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ success: false, templates: [], error: e.message });
  }
}
