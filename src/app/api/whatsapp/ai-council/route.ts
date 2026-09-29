import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, isOwnerAuthenticated } from "@/lib/authSession";
import { getClientAICouncilConfig, saveClientAICouncilConfig, INDUSTRY_PRESETS } from "@/lib/aiCouncilEngine";

// GET: Fetch client AI Council configuration
export async function GET(req: NextRequest) {
  try {
    const isOwner = isOwnerAuthenticated(req);
    const user = await getAuthenticatedUser(req);
    if (!isOwner && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId") || user?.clientId || null;

    const config = await getClientAICouncilConfig(clientId);

    return NextResponse.json({
      success: true,
      config,
      presets: Object.entries(INDUSTRY_PRESETS).map(([key, value]) => ({
        key,
        name: value.name,
        icon: value.icon,
        description: value.description,
      })),
    });
  } catch (err: any) {
    console.error("[GET /api/whatsapp/ai-council Error]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Save client AI Council configuration
export async function POST(req: NextRequest) {
  try {
    const isOwner = isOwnerAuthenticated(req);
    const user = await getAuthenticatedUser(req);
    if (!isOwner && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { config, clientId: bodyClientId } = body;

    if (!config) {
      return NextResponse.json({ error: "config object required" }, { status: 400 });
    }

    const clientId = user?.clientId || bodyClientId || null;
    const success = await saveClientAICouncilConfig(config, clientId);

    if (success) {
      return NextResponse.json({ success: true, message: "AI Council configuration saved successfully! 🏛️" });
    } else {
      return NextResponse.json({ error: "Failed to save AI Council configuration" }, { status: 500 });
    }
  } catch (err: any) {
    console.error("[POST /api/whatsapp/ai-council Error]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
