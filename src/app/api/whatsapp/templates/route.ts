import { NextRequest, NextResponse } from "next/server";
import { getWhatsAppTemplates } from "@/app/actions/whatsAppPlatformActions";
import { getAuthenticatedUser, isOwnerAuthenticated } from "@/lib/authSession";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const isOwner = isOwnerAuthenticated(req);
    if (!user && !isOwner) {
      return NextResponse.json({ success: false, templates: [], error: "Unauthorized access" }, { status: 401 });
    }

    const result = await getWhatsAppTemplates();
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ success: false, templates: [], error: e.message });
  }
}
