import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lookupPincode } from "@/lib/pincodeLookup";
import { getRecoveryAgentSettings } from "@/lib/paymentRecoveryAgent";
import { sendWhatsAppMessageAction } from "@/app/actions/whatsAppPlatformActions";
import { generateWhatsAppPaymentLinkAction } from "@/app/actions/whatsAppPlatformActions";
import { executeFlowEngine } from "@/lib/whatsappFlowEngine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      conversationId,
      customerId,
      clientId,
      fullName,
      phone,
      houseFlat,
      streetLandmark,
      postOffice,
      pincode,
      city: rawCity,
      state: rawState,
      paymentMode, // "FULL_COD" | "PARTIAL_COD" | "PREPAID"
      orderTotal: clientProvidedTotal,
      orderDescription: clientProvidedDesc,
    } = body;

    let conv = conversationId
      ? await prisma.whatsAppConversation.findUnique({
          where: { id: conversationId },
          include: { customer: true, client: true },
        })
      : null;

    let customer = conv?.customer || null;
    if (!customer && customerId) {
      customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: { client: true },
      });
    }

    const effectiveClientId = conv?.clientId || customer?.clientId || clientId || null;

    // Resolve City & State from Pincode if missing
    let city = rawCity || "";
    let state = rawState || "";
    const cleanPin = String(pincode || "").replace(/\D/g, "");

    if (cleanPin.length === 6 && (!city || !state)) {
      const pinData = await lookupPincode(cleanPin);
      if (pinData.valid) {
        if (!city) city = pinData.city || "";
        if (!state) state = pinData.state || "";
      }
    }

    const cleanName = (fullName || customer?.contactPerson || "Customer").trim();
    const cleanHouse = (houseFlat || "").trim();
    const cleanStreet = (streetLandmark || "").replace(/\[PO:.*?\]/gi, "").trim();
    const cleanPO = (postOffice || "").replace(/\[PO:.*?\]/gi, "").trim();

    const streetCombined = [cleanHouse, cleanStreet].filter(Boolean).join(", ");
    const areaCombined = [cleanPO ? cleanPO : "", city, state].filter(Boolean).join(", ");
    const formattedAddress = [streetCombined, areaCombined, cleanPin ? `PIN: ${cleanPin}` : ""].filter(Boolean).join(", ");

    // Update Customer record with verified delivery address
    if (customer?.id) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          shippingAddress: formattedAddress || undefined,
          billingAddress: formattedAddress || undefined,
          contactPerson: cleanName || customer.contactPerson,
          landmark: cleanStreet || undefined, // Store pure street / landmark without PO prefix
          notes: cleanPin
            ? `Pincode: ${cleanPin}, City: ${city}, State: ${state} | PO: ${cleanPO || 'N/A'} | Payment Preference: ${paymentMode || "COD"}`
            : customer.notes,
        },
      }).catch((e) => console.error("[Checkout Address Save Error]:", e.message));
    }

    // Determine order total and description
    let orderTotal = Number(clientProvidedTotal) || 0;
    let orderDesc = clientProvidedDesc || "Catalog Order";

    if (conv?.id && (!orderTotal || orderTotal === 0)) {
      const recentOrderMsg = await prisma.whatsAppMessage.findFirst({
        where: { conversationId: conv.id, messageType: "ORDER" },
        orderBy: { sentAt: "desc" },
      });

      if (recentOrderMsg?.metadata) {
        try {
          const meta = JSON.parse(recentOrderMsg.metadata);
          if (meta?.order?.totalAmount) orderTotal = Number(meta.order.totalAmount);
          if (meta?.order?.items && Array.isArray(meta.order.items)) {
            const itemSummary = meta.order.items.map((it: any) => `${it.quantity}x ${it.name}`).join(", ");
            orderDesc = `Order (${itemSummary})`;
          }
        } catch (_) {}
      }
    }

    const recSettings = await getRecoveryAgentSettings(effectiveClientId || undefined);
    const chosenMode = String(paymentMode || "FULL_COD").toUpperCase();
    const isFullCod = chosenMode === "FULL_COD" || chosenMode.includes("FULL COD") || chosenMode === "COD";

    // Create / ensure a WhatsAppPaymentLink record exists for this checkout
    if (conv?.id && customer?.id) {
      await prisma.whatsAppPaymentLink.create({
        data: {
          clientId: effectiveClientId,
          conversationId: conv.id,
          customerId: customer.id,
          amount: orderTotal || 0,
          paymentUrl: "",
          status: isFullCod ? "PENDING" : "PENDING",
          transactionId: isFullCod ? `COD_${Date.now()}` : undefined,
          orderId: orderDesc || "Order Items",
        }
      }).catch(() => null);
    }

    if (conv?.id) {
      const recipientPhone = customer?.whatsappNumber || customer?.mobile || phone || "";

      if (isFullCod) {
        // Full COD: Immediate Order Confirmation text dispatched to WhatsApp
        const confirmText =
          `🎉 *Order Confirmed (Cash on Delivery)!*\n\n` +
          `👤 *Recipient:* ${cleanName}\n` +
          `📞 *Contact Phone:* ${phone || recipientPhone}\n` +
          `📍 *Delivery Address:* ${streetCombined || "Standard Delivery Address"}\n` +
          `📮 *Area / City:* ${areaCombined || city || "India"}${cleanPin ? ` - ${cleanPin}` : ""}\n\n` +
          `📦 *Items / Plan:* ${orderDesc}\n` +
          `💵 *Total Payable on Delivery:* ₹${orderTotal > 0 ? orderTotal.toLocaleString("en-IN") : "COD"}\n\n` +
          `🚚 Our dispatch team is packaging your order. You will receive live courier tracking as soon as it ships!`;

        await sendWhatsAppMessageAction({
          conversationId: conv.id,
          senderId: "system",
          senderType: "SYSTEM",
          messageType: "TEXT",
          content: confirmText,
          senderName: "Order System",
        }).catch((e) => console.warn("[Send COD Confirmation Error]:", e.message));
      } else {
        // Calculate payable amount (Partial COD token or Prepaid discounted total)
        let payableAmount = orderTotal;
        let discountAmount = 0;
        if (chosenMode === "PARTIAL_COD") {
          if (recSettings.partialCodMode === "FIXED") {
            payableAmount = Math.min(orderTotal || 200, recSettings.partialCodValue || 200);
          } else {
            payableAmount = Math.max(1, Math.round(((orderTotal || 1000) * (recSettings.partialCodValue || 10)) / 100));
          }
        } else if (chosenMode === "PREPAID") {
          if (recSettings.prepaidDiscountPercent > 0 && orderTotal > 0) {
            discountAmount = Math.round((orderTotal * recSettings.prepaidDiscountPercent) / 100);
            payableAmount = Math.max(1, orderTotal - discountAmount);
          }
        }

        const deliveryMode = recSettings.paymentDeliveryMethod || "web_url";

        // If client selected direct WhatsApp QR or both: dispatch QR code image + bill on WhatsApp
        if (deliveryMode === "whatsapp_qr" || deliveryMode === "both" || recSettings.autoCatalogDeliveryMethod === "qr") {
          const clientRecord = effectiveClientId ? await prisma.whatsAppClient.findUnique({ where: { id: effectiveClientId } }).catch(() => null) : null;
          const payeeUpi = clientRecord?.merchantUpiId || "8447109898@PTYES";
          const payeeName = clientRecord?.merchantUpiName || clientRecord?.businessName || "Store";
          const upiDeepLink = `upi://pay?pa=${encodeURIComponent(payeeUpi)}&pn=${encodeURIComponent(payeeName)}&am=${payableAmount}&cu=INR&tn=${encodeURIComponent(`Order for ${orderDesc}`.slice(0, 40))}`;
          const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(upiDeepLink)}`;

          const qrMessage =
            `🛍️ *Order Address Confirmed! Complete Payment to Dispatch*\n\n` +
            `👤 *Recipient:* ${cleanName}\n` +
            `📍 *Delivery Address:* ${streetCombined || "Address on file"}, ${areaCombined || city || ""}${cleanPin ? ` - ${cleanPin}` : ""}\n` +
            `📦 *Order / Plan:* ${orderDesc}\n\n` +
            `💰 *Amount Payable:* *₹${payableAmount.toLocaleString("en-IN")}* (${chosenMode === "PARTIAL_COD" ? "Advance Token" : "100% Prepaid with Discount"})\n` +
            (chosenMode === "PARTIAL_COD" ? `💵 *COD Balance on Delivery:* ₹${(orderTotal - payableAmount).toLocaleString("en-IN")}\n` : "") +
            (discountAmount > 0 ? `🎁 *Prepaid Discount:* Saved ₹${discountAmount.toLocaleString("en-IN")}\n` : "") +
            `📱 *UPI ID:* \`${payeeUpi}\`\n` +
            `🏷️ *Payee Name:* ${payeeName}\n\n` +
            `📲 *How to Pay:* \n` +
            `1. Scan the attached QR code or copy the UPI ID above.\n` +
            `2. Pay *₹${payableAmount.toLocaleString("en-IN")}* from your UPI app (GPay / PhonePe / Paytm / BHIM).\n` +
            `3. Take a screenshot of the payment receipt and reply right here in this chat!\n\n` +
            `⚡ Our billing team will verify your screenshot and confirm your dispatch instantly!`;

          await sendWhatsAppMessageAction({
            conversationId: conv.id,
            senderId: "system",
            senderType: "SYSTEM",
            messageType: "IMAGE",
            mediaUrl: qrImageUrl,
            content: qrMessage,
            senderName: "Order System",
          }).catch((e) => console.warn("[Send WhatsApp Payment QR Error]:", e.message));
        }
      }

      // Resume active chatbot flow if any
      try {
        const fromPhone = customer?.whatsappNumber || customer?.mobile || phone || "";
        await executeFlowEngine(
          fromPhone,
          "FLOW_SUBMITTED",
          conv.id,
          false,
          effectiveClientId || undefined,
          undefined,
          {
            full_name: fullName,
            phone: phone || fromPhone,
            house_flat: houseFlat,
            street_landmark: streetLandmark,
            pincode: cleanPin,
            city,
            state,
            payment_mode: chosenMode,
          }
        );
      } catch (flowResumeErr) {
        console.error("[Checkout Submit Flow Resume Error]:", flowResumeErr);
      }
    }

    let payableAmount = orderTotal;
    if (chosenMode === "PARTIAL_COD") {
      if (recSettings.partialCodMode === "FIXED") {
        payableAmount = Math.min(orderTotal || 200, recSettings.partialCodValue || 200);
      } else {
        payableAmount = Math.max(1, Math.round(((orderTotal || 1000) * (recSettings.partialCodValue || 10)) / 100));
      }
    } else if (chosenMode === "PREPAID") {
      if (recSettings.prepaidDiscountPercent > 0 && orderTotal > 0) {
        const discountAmount = Math.round((orderTotal * recSettings.prepaidDiscountPercent) / 100);
        payableAmount = Math.max(1, orderTotal - discountAmount);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Delivery address submitted successfully.",
      paymentDeliveryMethod: recSettings.paymentDeliveryMethod || "web_url",
      payableAmount,
      orderTotal,
      paymentMode: chosenMode,
    });
  } catch (err: any) {
    console.error("[Checkout Submit Error]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
