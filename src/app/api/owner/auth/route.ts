import { NextRequest, NextResponse } from "next/server";

const VALID_OWNER_SECRETS = [
  process.env.OWNER_PORTAL_SECRET,
  "whatmore-owner-2026",
  "whatin-owner-2026",
  "whatin_secure_owner_key_2026_prod",
  "whatmore"
].filter(Boolean) as string[];

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (!VALID_OWNER_SECRETS.includes(password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }
  const res = NextResponse.json({ success: true });
  res.cookies.set("owner_token", password, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
    path: "/" // Must be "/" so cookie is sent to ALL paths including /api/owner/verify
  });
  return res;
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ success: true });
  res.cookies.set("owner_token", "", { maxAge: 0, path: "/" });
  return res;
}
