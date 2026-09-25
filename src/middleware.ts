import { NextRequest, NextResponse } from "next/server";

const SESSION_SECRET = process.env.SESSION_SECRET || "whatmore-session-2026";
const OWNER_SECRET  = process.env.OWNER_PORTAL_SECRET || "whatmore-owner-2026";
const VALID_OWNER_SECRETS = [
  process.env.OWNER_PORTAL_SECRET,
  "whatmore-owner-2026",
  "whatin-owner-2026",
  "whatin_secure_owner_key_2026_prod",
  "whatmore"
].filter(Boolean) as string[];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Owner portal auth ──────────────────────────────────────────────────────
  if (pathname.startsWith("/owner") && !pathname.startsWith("/owner/login")) {
    const ownerToken = req.cookies.get("owner_token")?.value;
    if (!ownerToken || !VALID_OWNER_SECRETS.includes(ownerToken)) {
      return NextResponse.redirect(new URL("/owner/login", req.url));
    }
  }

  // ── Client/Agent portal auth ───────────────────────────────────────────────
  if (pathname.startsWith("/whatsapp")) {
    const sessionToken = req.cookies.get("wm_session")?.value;
    const wmToken = req.cookies.get("wm_token")?.value;
    if (!sessionToken && !wmToken) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Root redirect ──────────────────────────────────────────────────────────
  if (pathname === "/") {
    const sessionToken = req.cookies.get("wm_session")?.value;
    const wmToken = req.cookies.get("wm_token")?.value;
    if (sessionToken || wmToken) {
      return NextResponse.redirect(new URL("/whatsapp/dashboard", req.url));
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/whatsapp/:path*", "/owner/:path*"],
};
