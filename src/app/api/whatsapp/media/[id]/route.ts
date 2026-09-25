import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/authSession";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: mediaId } = await params;
    if (!mediaId) {
      return NextResponse.json({ error: "Invalid or missing media ID" }, { status: 400 });
    }

    const cleanId = mediaId.trim();

    // 1. Check permanent database storage (WhatsAppUploadedMedia) first
    try {
      const dbMedia = await prisma.whatsAppUploadedMedia.findUnique({
        where: { id: cleanId }
      });
      if (dbMedia?.data) {
        const buf = Buffer.from(dbMedia.data);
        return new NextResponse(buf, {
          status: 200,
          headers: {
            'Content-Type': dbMedia.mimeType || 'image/jpeg',
            'Content-Length': buf.length.toString(),
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Content-Disposition': `inline; filename="whatsapp-media-${cleanId}"`
          }
        });
      }
    } catch (_) {}

    // 2. Check ProductUploadedImage database storage
    try {
      const dbProductImg = await prisma.productUploadedImage.findUnique({
        where: { id: cleanId }
      });
      if (dbProductImg?.data) {
        const buf = Buffer.from(dbProductImg.data);
        return new NextResponse(buf, {
          status: 200,
          headers: {
            'Content-Type': dbProductImg.mimeType || 'image/jpeg',
            'Content-Length': buf.length.toString(),
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Content-Disposition': `inline; filename="product-media-${cleanId}"`
          }
        });
      }
    } catch (_) {}

    // 3. Dynamic Multi-Tenant Meta Access Token Resolution
    const user = await getAuthenticatedUser(req).catch(() => null);
    let token: string | null = null;
    try {
      const msg = await prisma.whatsAppMessage.findFirst({
        where: {
          OR: [
            { mediaUrl: { contains: cleanId } },
            { metaMessageId: cleanId }
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

    if (!token && user?.clientId) {
      const client = await prisma.whatsAppClient.findUnique({
        where: { id: user.clientId }
      }).catch(() => null);
      if (client?.metaAccessToken) {
        token = client.metaAccessToken;
      }
    }

    if (!token) {
      const account = await prisma.whatsAppAccount.findFirst();
      token = account?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || null;
    }

    if (!token) {
      // Fallback: Check if we have an activewear default banner
      try {
        const fallbackMedia = await prisma.whatsAppUploadedMedia.findUnique({
          where: { id: 'espon_activewear_welcome' }
        });
        if (fallbackMedia?.data) {
          const buf = Buffer.from(fallbackMedia.data);
          return new NextResponse(buf, {
            status: 200,
            headers: {
              'Content-Type': fallbackMedia.mimeType || 'image/jpeg',
              'Content-Length': buf.length.toString(),
              'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
              'Content-Disposition': `inline; filename="espon-welcome.jpg"`
            }
          });
        }
      } catch (_) {}

      return NextResponse.json({ error: "Missing WhatsApp credentials for media tenant" }, { status: 500 });
    }

    // 4. Fetch media URL from Meta Graph API using Media ID
    const metaUrlRes = await fetch(`https://graph.facebook.com/v20.0/${cleanId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const metaUrlData = await metaUrlRes.json().catch(() => ({}));

    if (!metaUrlData.url || !metaUrlRes.ok) {
      // Check if this was a chatbot welcome banner or if we have activewear fallback
      try {
        const fallbackMedia = await prisma.whatsAppUploadedMedia.findUnique({
          where: { id: 'espon_activewear_welcome' }
        });
        if (fallbackMedia?.data) {
          const buf = Buffer.from(fallbackMedia.data);
          return new NextResponse(buf, {
            status: 200,
            headers: {
              'Content-Type': fallbackMedia.mimeType || 'image/jpeg',
              'Content-Length': buf.length.toString(),
              'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
              'Content-Disposition': `inline; filename="espon-welcome.jpg"`
            }
          });
        }
      } catch (_) {}

      // Return clean placeholder SVG
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
          'Content-Disposition': `inline; filename="whatsapp-media-expired-${cleanId}.svg"`
        }
      });
    }

    // 5. Download binary media file from Meta CDN
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
          'Content-Disposition': `inline; filename="whatsapp-media-unavailable-${cleanId}.svg"`
        }
      });
    }

    // 6. Cache downloaded media permanently in PostgreSQL so it never expires again
    const contentType = mediaFileRes.headers.get("content-type") || metaUrlData.mime_type || "application/octet-stream";
    const arrayBuffer = await mediaFileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
      await prisma.whatsAppUploadedMedia.upsert({
        where: { id: cleanId },
        update: { data: buffer, size: buffer.length, mimeType: contentType },
        create: {
          id: cleanId,
          filename: `meta_media_${cleanId}`,
          mimeType: contentType,
          data: buffer,
          size: buffer.length
        }
      });
    } catch (_) {}
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': `inline; filename="whatsapp-media-${cleanId}"`
      }
    });
    
  } catch (error: any) {
    console.error("[WhatsApp Media Proxy Error]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

