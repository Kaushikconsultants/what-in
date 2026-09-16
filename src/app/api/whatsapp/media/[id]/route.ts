import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, isOwnerAuthenticated } from "@/lib/authSession";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    const isOwner = await isOwnerAuthenticated(req);
    if (!user && !isOwner) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { id: mediaId } = await params;
    if (!mediaId || !/^\d+$/.test(mediaId.trim())) {
      return NextResponse.json({ error: "Invalid or missing numeric media ID" }, { status: 400 });
    }

    // Dynamic Multi-Tenant Meta Access Token Resolution:
    // 1. Check if media belongs to a specific message and client tenant
    let token: string | null = null;
    try {
      const msg = await prisma.whatsAppMessage.findFirst({
        where: {
          OR: [
            { mediaUrl: { contains: mediaId } },
            { metaMessageId: mediaId }
          ]
        },
        include: {
          conversation: {
            include: { client: true }
          }
        }
      });

      if (msg?.conversation?.client?.metaAccessToken) {
        token = msg.conversation.client.metaAccessToken;
      }
    } catch (_) {}

    // 2. Check active user session's client tenant
    if (!token && user?.clientId) {
      const client = await prisma.whatsAppClient.findUnique({
        where: { id: user.clientId }
      }).catch(() => null);
      if (client?.metaAccessToken) {
        token = client.metaAccessToken;
      }
    }

    // 3. Fallback: Main account or environment token
    if (!token) {
      const account = await prisma.whatsAppAccount.findFirst();
      token = account?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || null;
    }

    if (!token) return NextResponse.json({ error: "Missing WhatsApp credentials for media tenant" }, { status: 500 });

    // Step 1: Get media URL from Meta using Media ID
    const metaUrlRes = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const metaUrlData = await metaUrlRes.json();

    if (!metaUrlData.url || !metaUrlRes.ok) {
      // Create a clean SVG placeholder image so HTML <img> & media tags don't throw 404 network errors in DevTools
      const expiredSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240" fill="none">
  <rect width="400" height="240" rx="12" fill="#F8FAFC"/>
  <rect x="1" y="1" width="398" height="238" rx="11" stroke="#E2E8F0" stroke-width="2" stroke-dasharray="6 6"/>
  <circle cx="200" cy="95" r="26" fill="#E2E8F0"/>
  <path d="M192 95H208M200 87V103" stroke="#94A3B8" stroke-width="2.5" stroke-linecap="round"/>
  <text x="200" y="145" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#475569" text-anchor="middle">WhatsApp Media Expired</text>
  <text x="200" y="165" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#94A3B8" text-anchor="middle">Meta removes temporary media after 30 days</text>
</svg>`;

      return new NextResponse(expiredSvg, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'Content-Disposition': `inline; filename="whatsapp-media-expired-${mediaId}.svg"`
        }
      });
    }

    // Step 2: Download binary media file securely
    const mediaFileRes = await fetch(metaUrlData.url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!mediaFileRes.ok) {
      const expiredSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240" fill="none">
  <rect width="400" height="240" rx="12" fill="#F8FAFC"/>
  <rect x="1" y="1" width="398" height="238" rx="11" stroke="#E2E8F0" stroke-width="2" stroke-dasharray="6 6"/>
  <circle cx="200" cy="95" r="26" fill="#E2E8F0"/>
  <path d="M192 95H208" stroke="#94A3B8" stroke-width="2.5" stroke-linecap="round"/>
  <text x="200" y="145" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#475569" text-anchor="middle">Media Unavailable</text>
  <text x="200" y="165" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#94A3B8" text-anchor="middle">Could not retrieve file from Meta CDN</text>
</svg>`;

      return new NextResponse(expiredSvg, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'Content-Disposition': `inline; filename="whatsapp-media-unavailable-${mediaId}.svg"`
        }
      });
    }

    // Step 3: Stream it back to the client directly with proper headers and Content-Length to enable seeking/playback in HTML5 audio
    const contentType = mediaFileRes.headers.get("content-type") || metaUrlData.mime_type || "application/octet-stream";
    const arrayBuffer = await mediaFileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=86400, immutable',
        'Content-Disposition': `inline; filename="whatsapp-media-${mediaId}"`
      }
    });
    
  } catch (error: any) {
    console.error("[WhatsApp Media Proxy Error]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
