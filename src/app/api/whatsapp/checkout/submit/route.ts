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
          landmark: [cleanPO ? `PO: ${cleanPO}` : "", cleanStreet].filter(Boolean).join(" ") || undefined,
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
    const isPartialCod = chosenMode === "PARTIAL_COD" || chosenMode.includes("PARTIAL") || chosenMode.includes("TOKEN");

    if (conv?.id) {
      const recipientPhone = customer?.whatsappNumber || customer?.mobile || phone || "";

      if (isFullCod) {
        // 1. Full COD: No advance required. Immediate Order Confirmation.
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
        });
      } else if (isPartialCod) {
        // 2. Partial COD: Calculate advance token based on tenant admin setting
        let advanceAmount = 0;
        if (recSettings.partialCodMode === "FIXED") {
          advanceAmount = Math.min(orderTotal || 200, recSettings.partialCodValue || 200);
        } else {
          advanceAmount = Math.max(1, Math.round(((orderTotal || 1000) * (recSettings.partialCodValue || 10)) / 100));
        }
        const codBalance = Math.max(0, (orderTotal || advanceAmount) - advanceAmount);

        const summaryNotice =
          `✅ *Order & Delivery Details Confirmed!*\n\n` +
          `👤 *Recipient:* ${cleanName}\n` +
          `📞 *Contact Phone:* ${phone || recipientPhone}\n` +
          `📍 *Delivery Address:* ${streetCombined || "Delivery Address"}\n` +
          `📮 *Area / City:* ${areaCombined || city || "India"}${cleanPin ? ` - ${cleanPin}` : ""}\n\n` +
          `📦 *Items / Plan:* ${orderDesc}\n` +
          `💰 *Total Order Value:* ₹${orderTotal > 0 ? orderTotal.toLocaleString("en-IN") : (advanceAmount + codBalance).toLocaleString("en-IN")}\n` +
          `🪙 *Payment Preference:* Partial Advance COD\n` +
          `• Advance Token (Pay Now): *₹${advanceAmount.toLocaleString("en-IN")}*\n` +
          `• Balance on Delivery: *₹${codBalance.toLocaleString("en-IN")}*\n\n` +
          `Kripya apna order dispatch confirm karne ke liye niche diye gaye UPI QR / Payment Link se *₹${advanceAmount.toLocaleString("en-IN")}* token advance pay karein:`;

        await sendWhatsAppMessageAction({
          conversationId: conv.id,
          senderId: "system",
          senderType: "SYSTEM",
          messageType: "TEXT",
          content: summaryNotice,
          senderName: "Order System",
        });

        if (customer?.id && advanceAmount > 0) {
          await generateWhatsAppPaymentLinkAction({
            conversationId: conv.id,
            customerId: customer.id,
            amount: advanceAmount,
            description: `Token Advance (₹${advanceAmount}) for ${orderDesc}. Balance ₹${codBalance} on COD`,
            deliveryMethod: recSettings.autoCatalogDeliveryMethod || "both",
          });
        }
      } else {
        // 3. Full Prepaid: Apply optional prepaid discount if configured
        let finalAmount = orderTotal;
        let discountSaved = 0;
        if (recSettings.prepaidDiscountPercent > 0 && orderTotal > 0) {
          discountSaved = Math.round((orderTotal * recSettings.prepaidDiscountPercent) / 100);
          finalAmount = Math.max(1, orderTotal - discountSaved);
        }

        const summaryNotice =
          `✅ *Order & Delivery Details Confirmed!*\n\n` +
          `👤 *Recipient:* ${cleanName}\n` +
          `📞 *Contact Phone:* ${phone || recipientPhone}\n` +
          `📍 *Delivery Address:* ${streetCombined || "Delivery Address"}\n` +
          `📮 *Area / City:* ${areaCombined || city || "India"}${cleanPin ? ` - ${cleanPin}` : ""}\n\n` +
          `📦 *Items / Plan:* ${orderDesc}\n` +
          (discountSaved > 0 ? `🎉 *Instant Prepaid Offer:* Saved ₹${discountSaved} (${recSettings.prepaidDiscountPercent}% Instant Discount)\n` : "") +
          `💰 *Total Payable:* *₹${finalAmount > 0 ? finalAmount.toLocaleString("en-IN") : "As per Selected Plan"}*\n` +
          `🪙 *Payment Method:* 100% Online UPI\n\n` +
          `Kripya niche diye gaye UPI QR / Payment Link se secure online payment complete karein:`;

        await sendWhatsAppMessageAction({
          conversationId: conv.id,
          senderId: "system",
          senderType: "SYSTEM",
          messageType: "TEXT",
          content: summaryNotice,
          senderName: "Order System",
        });

        if (customer?.id && finalAmount > 0) {
          await generateWhatsAppPaymentLinkAction({
            conversationId: conv.id,
            customerId: customer.id,
            amount: finalAmount,
            description: orderDesc,
            deliveryMethod: recSettings.autoCatalogDeliveryMethod || "both",
          });
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

    return NextResponse.json({
      success: true,
      message: "Delivery address submitted successfully. Order confirmation and payment link sent to WhatsApp.",
    });
  } catch (err: any) {
    console.error("[Checkout Submit Error]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
