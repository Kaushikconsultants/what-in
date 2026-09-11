import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing image id" }, { status: 400 });
    }

    // Check PostgreSQL database first
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT "data", "mimeType", "size" FROM "ProductUploadedImage" WHERE "id" = $1 LIMIT 1;`,
      id
    );

    if (rows && rows.length > 0 && rows[0].data) {
      const row = rows[0];
      const buffer = Buffer.from(row.data);
      const mimeType = row.mimeType || "image/jpeg";

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Length": buffer.length.toString(),
          "Cache-Control": "public, max-age=31536000, immutable",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // Fallback: Check local public/uploads directory
    const filePath = path.join(process.cwd(), "public", "uploads", id);
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(id).toLowerCase().replace(".", "");
      const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Length": buffer.length.toString(),
          "Cache-Control": "public, max-age=31536000, immutable",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  } catch (error: any) {
    console.error("[Product Image Serve Error]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
