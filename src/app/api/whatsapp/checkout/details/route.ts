import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRecoveryAgentSettings } from "@/lib/paymentRecoveryAgent";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conv") || searchParams.get("conversationId") || "";
    const customerId = searchParams.get("c") || searchParams.get("customerId") || "";
    const clientIdParam = searchParams.get("client") || searchParams.get("clientId") || "";
    const amountParam = searchParams.get("amt") || searchParams.get("amount") || "";

    let conversation: any = null;
    let customer: any = null;
    let client: any = null;

    if (conversationId) {
      conversation = await prisma.whatsAppConversation.findUnique({
        where: { id: conversationId },
        include: {
          customer: true,
          client: true,
        },
      });
      if (conversation) {
        customer = conversation.customer;
        client = conversation.client;
      }
    }

    if (!customer && customerId) {
      customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: { client: true },
      });
      if (customer && !client) client = customer.client;
    }

    const effectiveClientId = client?.id || clientIdParam || null;
    if (!client && effectiveClientId) {
      client = await prisma.whatsAppClient.findUnique({
        where: { id: effectiveClientId },
      });
    }

    const recoverySettings = await getRecoveryAgentSettings(effectiveClientId || undefined);

    // Look for recent catalog order message in this conversation
    let items: any[] = [];
    let orderTotal = Number(amountParam) || 0;
    let orderDesc = "Order Items";

    if (conversation?.id) {
      const recentOrderMsg = await prisma.whatsAppMessage.findFirst({
        where: {
          conversationId: conversation.id,
          messageType: "ORDER",
        },
        orderBy: { sentAt: "desc" },
      });

      if (recentOrderMsg?.metadata) {
        try {
          const meta = JSON.parse(recentOrderMsg.metadata);
          if (meta?.order?.items && Array.isArray(meta.order.items)) {
            items = meta.order.items.map((it: any) => ({
              name: it.name || "Product",
              quantity: Number(it.quantity) || 1,
              price: Number(it.price) || (Number(it.item_price) || 0),
              image: it.image || "",
            }));
          }
          if (meta?.order?.totalAmount && !orderTotal) {
            orderTotal = Number(meta.order.totalAmount);
          }
        } catch (_) {}
      }
    }

    const productParam = searchParams.get("p") || searchParams.get("product") || searchParams.get("item") || searchParams.get("desc") || "";
    if (items.length === 0 && (orderTotal > 0 || productParam)) {
      items = [{
        name: productParam || "Selected Package / Product",
        quantity: 1,
        price: orderTotal || 0,
        image: "",
      }];
      if (productParam) orderDesc = productParam;
    }

    // Parse existing address parts if available
    let housePart = "";
    let streetPart = customer?.landmark || "";
    let pincodePart = "";
    let cityPart = "";
    let statePart = "";

    const rawAddr = customer?.shippingAddress || customer?.billingAddress || "";
    if (rawAddr) {
      const pinMatch = rawAddr.match(/\b\d{6}\b/);
      if (pinMatch) pincodePart = pinMatch[0];
    }
    if (customer?.notes) {
      const pinM = customer.notes.match(/Pincode:\s*(\d{6})/i);
      if (pinM) pincodePart = pinM[1];
      const cityM = customer.notes.match(/City:\s*([^,\n]+)/i);
      if (cityM) cityPart = cityM[1].trim();
      const stateM = customer.notes.match(/State:\s*([^,\n]+)/i);
      if (stateM) statePart = stateM[1].trim();
    }

    const cleanPhone = (customer?.whatsappNumber || customer?.mobile || "").replace(/\D/g, "");
    const phone10 = cleanPhone.length === 12 && cleanPhone.startsWith("91") ? cleanPhone.slice(2) : cleanPhone;

    return NextResponse.json({
      success: true,
      data: {
        storeName: client?.businessName || "Official Store",
        clientPhone: client?.phoneNumber || "",
        customerId: customer?.id || "",
        conversationId: conversation?.id || "",
        clientId: effectiveClientId,
        customerName: customer?.contactPerson || "",
        customerPhone: phone10 || "",
        houseFlat: housePart,
        streetLandmark: streetPart,
        pincode: pincodePart,
        city: cityPart,
        state: statePart,
        rawAddress: rawAddr,
        items,
        orderTotal,
        orderDesc,
        recoverySettings: {
          allowedPaymentModes: recoverySettings.allowedPaymentModes || ["PREPAID", "PARTIAL_COD"],
          partialCodMode: recoverySettings.partialCodMode || "PERCENTAGE",
          partialCodValue: recoverySettings.partialCodValue || 10,
          prepaidDiscountPercent: recoverySettings.prepaidDiscountPercent || 5,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
