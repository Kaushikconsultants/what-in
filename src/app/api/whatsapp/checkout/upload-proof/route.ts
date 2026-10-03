import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { sendWhatsAppMessageAction } from "@/app/actions/whatsAppPlatformActions";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let buffer: Buffer;
    let filename = `proof_${Date.now()}.jpg`;
    let mimeType = "image/jpeg";
    let conversationId = "";
    let customerId = "";
    let clientId = "";
    let amount = 0;
    let paymentMode = "PREPAID";
    let utr = "";
    let orderDesc = "Order Items";
    let customerName = "Customer";
    let customerPhone = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ success: false, error: "No screenshot file uploaded." }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      filename = file.name || filename;
      mimeType = file.type || mimeType;

      conversationId = String(formData.get("conversationId") || "");
      customerId = String(formData.get("customerId") || "");
      clientId = String(formData.get("clientId") || "");
      amount = Number(formData.get("amount")) || 0;
      paymentMode = String(formData.get("paymentMode") || "PREPAID");
      utr = String(formData.get("utr") || "").trim();
      orderDesc = String(formData.get("orderDescription") || "Order Items");
      customerName = String(formData.get("customerName") || "Customer");
      customerPhone = String(formData.get("customerPhone") || "");
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

      conversationId = body.conversationId || "";
      customerId = body.customerId || "";
      clientId = body.clientId || "";
      amount = Number(body.amount) || 0;
      paymentMode = body.paymentMode || "PREPAID";
      utr = String(body.utr || "").trim();
      orderDesc = body.orderDescription || "Order Items";
      customerName = body.customerName || "Customer";
      customerPhone = body.customerPhone || "";
    }

    if (!mimeType.startsWith("image/")) {
      return NextResponse.json({ success: false, error: "Only image screenshots (JPG, PNG, WEBP) are allowed." }, { status: 400 });
    }

    // Generate unique ID
    const cleanExt = filename.includes(".") ? filename.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "jpg";
    const imageId = `proof_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${cleanExt}`;

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
    } catch (_) {}

    // Determine host for full public HTTPS URL
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "what-in.tinkal.in";
    const publicScreenshotUrl = `${proto}://${host}/api/whatsapp/product-image/${imageId}`;

    // Find conversation and customer
    let conv: any = null;
    let client: any = null;
    if (conversationId) {
      conv = await prisma.whatsAppConversation.findUnique({
        where: { id: conversationId },
        include: { customer: true, client: true },
      });
      if (conv) client = conv.client;
    }

    const effectiveClientId = conv?.clientId || clientId || client?.id || null;
    if (!client && effectiveClientId) {
      client = await prisma.whatsAppClient.findUnique({ where: { id: effectiveClientId } });
    }

    // Create / Update Payment Link record marked as PAYMENT_UNDER_REVIEW
    const proofMetadata = JSON.stringify({
      proofScreenshotUrl: publicScreenshotUrl,
      utr: utr || undefined,
      submittedAt: new Date().toISOString(),
      paymentMode,
      amount,
      orderDesc,
    });

    let paymentLink: any = null;
    if (conversationId && customerId) {
      paymentLink = await prisma.whatsAppPaymentLink.create({
        data: {
          clientId: effectiveClientId,
          conversationId,
          customerId,
          amount: amount || 0,
          paymentUrl: publicScreenshotUrl,
          status: "PAYMENT_UNDER_REVIEW",
          transactionId: utr || `UTR_${Date.now()}`,
        },
      });
    }

    // Attach to Customer record
    if (customerId) {
      const existingCust = await prisma.customer.findUnique({ where: { id: customerId } }).catch(() => null);
      if (existingCust) {
        const updatedNotes = [
          existingCust.notes || "",
          `[PROOF UPLOADED]: ₹${amount} (${paymentMode}) | UTR: ${utr || "N/A"} | SS: ${publicScreenshotUrl}`
        ].filter(Boolean).join(" | ");

        await prisma.customer.update({
          where: { id: customerId },
          data: { notes: updatedNotes },
        }).catch(() => null);
      }
    }

    // 1. Send WhatsApp message to Customer
    if (conversationId) {
      const custNotice =
        `📋 *Payment Proof Received!*\n\n` +
        `Dear ${customerName},\n` +
        `We have received your payment screenshot for *₹${amount > 0 ? amount.toLocaleString("en-IN") : "your order"}* (${paymentMode === "PARTIAL_COD" ? "Advance Token" : "Prepaid UPI"}).\n\n` +
        (utr ? `🔢 *UTR / Transaction Ref:* ${utr}\n` : "") +
        `⏳ *Status:* Verification in Progress.\n` +
        `Our billing team will verify the payment and confirm your dispatch shortly!`;

      await sendWhatsAppMessageAction({
        conversationId,
        senderId: "system",
        senderType: "SYSTEM",
        messageType: "TEXT",
        content: custNotice,
        senderName: "Billing Team",
        metadata: proofMetadata,
      }).catch((e) => console.warn("[Send Customer Proof Received Notice Error]:", e.message));
    }

    // 2. Send WhatsApp Notification to Admin / Merchant Phone if available
    const adminPhone = client?.phoneNumber || "";
    if (adminPhone) {
      const adminNotice =
        `🔔 *NEW PAYMENT PROOF UPLOADED!*\n\n` +
        `👤 *Customer:* ${customerName} (${customerPhone || "WhatsApp User"})\n` +
        `📦 *Order / Plan:* ${orderDesc}\n` +
        `💰 *Amount:* ₹${amount.toLocaleString("en-IN")} (${paymentMode})\n` +
        (utr ? `🔢 *UTR / Ref:* ${utr}\n` : "") +
        `📸 *Screenshot:* ${publicScreenshotUrl}\n\n` +
        `👉 *Action Required:* Open Admin Dashboard > Orders to verify & approve payment!`;

      // Find or create admin conversation to dispatch alert
      try {
        const adminConv = await prisma.whatsAppConversation.findFirst({
          where: {
            clientId: effectiveClientId,
            customer: {
              OR: [
                { whatsappNumber: adminPhone },
                { mobile: adminPhone }
              ]
            }
          }
        });

        if (adminConv?.id) {
          await sendWhatsAppMessageAction({
            conversationId: adminConv.id,
            senderId: "system",
            senderType: "SYSTEM",
            messageType: "TEXT",
            content: adminNotice,
            senderName: "What-In Alerts",
          });
        }
      } catch (adminErr: any) {
        console.warn("[Admin WhatsApp Alert Notice Error]:", adminErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      url: publicScreenshotUrl,
      paymentLinkId: paymentLink?.id,
      message: "Payment proof uploaded successfully and queued for admin verification.",
    });
  } catch (err: any) {
    console.error("[Upload Proof Error]:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to upload payment proof." }, { status: 500 });
  }
}
