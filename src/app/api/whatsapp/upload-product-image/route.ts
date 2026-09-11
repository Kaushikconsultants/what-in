import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    let buffer: Buffer;
    let filename = `image_${Date.now()}.jpg`;
    let mimeType = "image/jpeg";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ success: false, error: "No image file uploaded." }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      filename = file.name || filename;
      mimeType = file.type || mimeType;
    } else {
      const body = await req.json();
      if (!body.fileDataUrl) {
        return NextResponse.json({ success: false, error: "Missing fileDataUrl or file." }, { status: 400 });
      }

      const matches = body.fileDataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        buffer = Buffer.from(matches[2], "base64");
      } else {
        const base64Data = body.fileDataUrl.includes(",") ? body.fileDataUrl.split(",")[1] : body.fileDataUrl;
        buffer = Buffer.from(base64Data, "base64");
      }
      if (body.filename) filename = body.filename;
      if (body.mimeType) mimeType = body.mimeType;
    }

    if (!mimeType.startsWith("image/")) {
      return NextResponse.json({ success: false, error: "Only image files (JPG, PNG, WEBP, GIF) are allowed." }, { status: 400 });
    }

    // Generate unique ID
    const cleanExt = filename.includes(".") ? filename.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "jpg";
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${cleanExt}`;

    // Save to PostgreSQL ProductUploadedImage table for permanent durability across Railway redeployments
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ProductUploadedImage" ("id", "filename", "mimeType", "data", "size", "createdAt")
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT ("id") DO UPDATE SET "data" = EXCLUDED."data", "size" = EXCLUDED."size";`,
      imageId,
      filename,
      mimeType,
      buffer,
      buffer.length
    );

    // Also write to local public/uploads directory if possible as cache
    try {
      const publicUploadsDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(publicUploadsDir)) {
        fs.mkdirSync(publicUploadsDir, { recursive: true });
      }
      fs.writeFileSync(path.join(publicUploadsDir, imageId), buffer);
    } catch (_) {
      // Ignored if public folder is read-only in serverless/container environment
    }

    // Determine host for full public HTTPS URL required by Meta Catalog
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "whatsapp.esponsports.com";
    const publicUrl = `${proto}://${host}/api/whatsapp/product-image/${imageId}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      id: imageId,
      filename,
      size: buffer.length,
      mimeType
    });
  } catch (error: any) {
    console.error("[Upload Product Image Error]:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to upload image." }, { status: 500 });
  }
}
