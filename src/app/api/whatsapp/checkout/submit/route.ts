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
      message: "Delivery address submitted successfully.",
    });
  } catch (err: any) {
    console.error("[Checkout Submit Error]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
