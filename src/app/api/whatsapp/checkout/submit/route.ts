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

    const fullAddrParts = [houseFlat, streetLandmark].filter(Boolean).join(", ");
    const formattedAddress = [fullAddrParts, city, state, cleanPin ? `PIN: ${cleanPin}` : ""]
      .filter(Boolean)
      .join(", ");

    // Update Customer record with verified delivery address
    if (customer?.id) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          shippingAddress: formattedAddress || undefined,
          billingAddress: formattedAddress || undefined,
          contactPerson: fullName || customer.contactPerson,
          landmark: streetLandmark || undefined,
          notes: cleanPin
            ? `Pincode: ${cleanPin}, City: ${city}, State: ${state} | Payment Preference: ${paymentMode || "COD"}`
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
          `📦 *Items:* ${orderDesc}\n` +
          `💵 *Total Payable on Delivery:* ₹${orderTotal > 0 ? orderTotal.toLocaleString("en-IN") : "COD"}\n\n` +
          `📍 *Delivery Address:*\n${fullAddrParts}${city ? ", " + city : ""}${state ? ", " + state : ""} - ${cleanPin}\n` +
          `👤 *Recipient:* ${fullName || customer?.contactPerson || "Customer"}\n` +
          `📞 *Contact Phone:* ${phone || recipientPhone}\n\n` +
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
          `✅ *Delivery Address Confirmed!*\n` +
          `📍 ${fullAddrParts}${city ? ", " + city : ""}${state ? ", " + state : ""} - ${cleanPin}\n\n` +
          `🪙 *Payment Preference: Partial COD*\n` +
          `• Total Order Value: *₹${orderTotal.toLocaleString("en-IN")}*\n` +
          `• Advance Token (to confirm dispatch): *₹${advanceAmount.toLocaleString("en-IN")}*\n` +
          `• Balance COD (payable on delivery): *₹${codBalance.toLocaleString("en-IN")}*\n\n` +
          `Kripya apna order dispatch confirm karne ke liye niche diye gaye UPI QR / Payment Link se ₹${advanceAmount} token advance pay karein:`;

        await sendWhatsAppMessageAction({
          conversationId: conv.id,
          senderId: "system",
          senderType: "SYSTEM",
          messageType: "TEXT",
          content: summaryNotice,
          senderName: "Order System",
        });

        if (customer?.id) {
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
        let discountNotice = "";
        if (recSettings.prepaidDiscountPercent > 0 && orderTotal > 0) {
          const discount = Math.round((orderTotal * recSettings.prepaidDiscountPercent) / 100);
          finalAmount = Math.max(1, orderTotal - discount);
          discountNotice = `\n🎁 *Prepaid Privilege Offer:* Saved ₹${discount} (${recSettings.prepaidDiscountPercent}% OFF applied!)`;
        }

        const summaryNotice =
          `✅ *Delivery Address Confirmed!*\n` +
          `📍 ${fullAddrParts}${city ? ", " + city : ""}${state ? ", " + state : ""} - ${cleanPin}${discountNotice}\n` +
          `• Total Payable: *₹${finalAmount > 0 ? finalAmount.toLocaleString("en-IN") : "Online"}*\n\n` +
          `Kripya niche diye gaye UPI QR / Payment Link se secure online payment complete karein:`;

        await sendWhatsAppMessageAction({
          conversationId: conv.id,
          senderId: "system",
          senderType: "SYSTEM",
          messageType: "TEXT",
          content: summaryNotice,
          senderName: "Order System",
        });

        if (customer?.id) {
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
