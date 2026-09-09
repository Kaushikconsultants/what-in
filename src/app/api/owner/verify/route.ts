import { NextRequest, NextResponse } from "next/server";

const OWNER_SECRET = process.env.OWNER_PORTAL_SECRET || "whatin-owner-2026";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("owner_token")?.value;
  if (token === OWNER_SECRET) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}
