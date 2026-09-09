import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { fileDataUrl, filename, mimeType } = await req.json();
    if (!fileDataUrl) {
      return NextResponse.json({ success: false, error: "fileDataUrl is required" }, { status: 400 });
    }

    const account = await prisma.whatsAppAccount.findFirst();
    const token = account?.accessToken;
    const phoneId = account?.phoneId;
    if (!token || !phoneId) {
      return NextResponse.json({ success: false, error: "Missing WhatsApp credentials" }, { status: 400 });
    }

    const base64Data = fileDataUrl.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    let finalBuffer = buffer;
    let finalMimeType = mimeType;
    let finalFilename = filename;

    // Transcode WebM audio files to MP3 using ffmpeg-static to satisfy Meta API requirements
    if (mimeType?.includes("webm") || filename?.endsWith(".webm")) {
      console.log("[FFmpeg] Converting WebM audio to MP3...");
      const tempDir = os.tmpdir();
      const inputPath = path.join(tempDir, `input_${Date.now()}.webm`);
      const outputPath = path.join(tempDir, `output_${Date.now()}.mp3`);

      fs.writeFileSync(inputPath, buffer);

      try {
        const ffmpeg = require("ffmpeg-static");
        await new Promise((resolve, reject) => {
          exec(`"${ffmpeg}" -i "${inputPath}" -codec:a libmp3lame -qscale:a 2 "${outputPath}"`, (error, stdout, stderr) => {
            if (error) {
              console.error("[FFmpeg Transcode Error]:", error, stderr);
              reject(error);
            } else {
              resolve();
            }
          });
        });

        finalBuffer = fs.readFileSync(outputPath);
        finalMimeType = "audio/mpeg";
        finalFilename = filename.replace(/\.webm$/i, ".mp3");
      } catch (err) {
        console.error("[FFmpeg Runner failed, falling back to original bytes]:", err);
      } finally {
        try { fs.unlinkSync(inputPath); } catch (_) {}
        try { fs.unlinkSync(outputPath); } catch (_) {}
      }
    }

    const blob = new Blob([finalBuffer], { type: finalMimeType });

    const formData = new FormData();
    formData.append('file', blob, finalFilename);
    formData.append('type', finalMimeType);
    formData.append('messaging_product', 'whatsapp');

    const url = `https://graph.facebook.com/v20.0/${phoneId}/media`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    const resData = await response.json();
    if (resData.id) {
      return NextResponse.json({ success: true, mediaId: resData.id });
    } else {
      return NextResponse.json({ success: false, error: resData.error?.message || "Upload failed" }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
