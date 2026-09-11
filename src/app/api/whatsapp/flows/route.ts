import { NextRequest, NextResponse } from "next/server";
import { getWhatsAppMetaFlows, saveWhatsAppMetaFlowAction } from "@/app/actions/whatsAppPlatformActions";
import { getAuthenticatedUser, isOwnerAuthenticated } from "@/lib/authSession";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    const isOwner = isOwnerAuthenticated(request);
    if (!user && !isOwner) {
      return NextResponse.json({ success: false, error: "Unauthorized access", flows: [] }, { status: 401 });
    }

    const result = await getWhatsAppMetaFlows();
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message, flows: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    const isOwner = isOwnerAuthenticated(request);
    if (!user && !isOwner) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    const body = await request.json();
    const result = await saveWhatsAppMetaFlowAction(body);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
