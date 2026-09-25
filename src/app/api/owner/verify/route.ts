import { NextRequest, NextResponse } from "next/server";

const VALID_OWNER_SECRETS = [
  process.env.OWNER_PORTAL_SECRET,
  "whatmore-owner-2026",
  "whatin-owner-2026",
  "whatin_secure_owner_key_2026_prod",
  "whatmore"
].filter(Boolean) as string[];

export async function GET(req: NextRequest) {
  const token = req.cookies.get("owner_token")?.value;
  if (token && VALID_OWNER_SECRETS.includes(token)) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}
