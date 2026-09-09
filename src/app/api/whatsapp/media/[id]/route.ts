import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: mediaId } = await params;
    if (!mediaId) return NextResponse.json({ error: "Missing media ID" }, { status: 400 });

    const account = await prisma.whatsAppAccount.findFirst();
    const token = account?.accessToken;

    if (!token) return NextResponse.json({ error: "Missing WhatsApp credentials" }, { status: 500 });

    // Step 1: Get media URL from Meta using Media ID
    const metaUrlRes = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const metaUrlData = await metaUrlRes.json();

    if (!metaUrlData.url) {
      return NextResponse.json({ error: "Media URL not found from Meta API", details: metaUrlData }, { status: 404 });
    }

    // Step 2: Download binary media file securely
    const mediaFileRes = await fetch(metaUrlData.url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!mediaFileRes.ok) {
      return NextResponse.json({ error: "Failed to download media file from Meta" }, { status: mediaFileRes.status });
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
