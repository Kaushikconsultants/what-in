import { NextResponse } from "next/server";
import { getWhatsAppMetaFlows, saveWhatsAppMetaFlowAction } from "@/app/actions/whatsAppPlatformActions";

export async function GET() {
  try {
    const result = await getWhatsAppMetaFlows();
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message, flows: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await saveWhatsAppMetaFlowAction(body);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message });
  }
}
