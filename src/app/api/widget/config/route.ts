import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/authSession";

async function resolveClient(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paramClientId = searchParams.get("clientId");
  if (paramClientId) {
    const client = await prisma.whatsAppClient.findUnique({ where: { id: paramClientId } });
    if (client) return client;
  }

  const user = await getAuthenticatedUser(req);
  if (user?.clientId) {
    const client = await prisma.whatsAppClient.findUnique({ where: { id: user.clientId } });
    if (client) return client;
  }

  return await prisma.whatsAppClient.findFirst({ orderBy: { createdAt: "asc" } });
}

/**
 * GET /api/widget/config
 * Fetch current website widget configuration and stats.
 */
export async function GET(req: NextRequest) {
  try {
    const client = await resolveClient(req);
    if (!client) {
      return NextResponse.json({ success: false, error: "Client not found." }, { status: 404 });
    }

    let widget = await prisma.whatsAppWebsiteWidget.findUnique({
      where: { clientId: client.id },
    });

    if (!widget) {
      widget = await prisma.whatsAppWebsiteWidget.create({
        data: {
          clientId: client.id,
          themeColor: "#25D366",
          position: "bottom-right",
          heading: "Chat with us on WhatsApp",
          subheading: "Typically replies in a few minutes",
          welcomeMessage: "Hi! I have an inquiry from your website.",
          requireLeadForm: false,
          showOnMobile: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      widget: {
        ...widget,
        phoneNumber: client.phoneNumber || "+91 74043 88242",
        embedSnippet: `<script src="${process.env.NEXT_PUBLIC_APP_URL || "https://whatsapp.esponsports.com"}/api/widget/script.js?clientId=${client.id}" async></script>`,
      },
    });
  } catch (err: any) {
    console.error("[Widget Config GET] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/widget/config
 * Update website widget configuration.
 */
export async function POST(req: NextRequest) {
  try {
    const client = await resolveClient(req);
    if (!client) {
      return NextResponse.json({ success: false, error: "Client not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      themeColor,
      position,
      heading,
      subheading,
      welcomeMessage,
      avatarUrl,
      requireLeadForm,
      showOnMobile,
      allowedDomains,
    } = body;

    const updated = await prisma.whatsAppWebsiteWidget.upsert({
      where: { clientId: client.id },
      create: {
        clientId: client.id,
        themeColor: themeColor || "#25D366",
        position: position || "bottom-right",
        heading: heading || "Chat with us on WhatsApp",
        subheading: subheading || "Typically replies in a few minutes",
        welcomeMessage: welcomeMessage || "Hi! I have an inquiry from your website.",
        avatarUrl: avatarUrl || null,
        requireLeadForm: Boolean(requireLeadForm),
        showOnMobile: showOnMobile !== false,
        allowedDomains: allowedDomains || null,
      },
      update: {
        themeColor: themeColor !== undefined ? themeColor : undefined,
        position: position !== undefined ? position : undefined,
        heading: heading !== undefined ? heading : undefined,
        subheading: subheading !== undefined ? subheading : undefined,
        welcomeMessage: welcomeMessage !== undefined ? welcomeMessage : undefined,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
        requireLeadForm: requireLeadForm !== undefined ? Boolean(requireLeadForm) : undefined,
        showOnMobile: showOnMobile !== undefined ? Boolean(showOnMobile) : undefined,
        allowedDomains: allowedDomains !== undefined ? allowedDomains : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Widget settings saved successfully.",
      widget: updated,
    });
  } catch (err: any) {
    console.error("[Widget Config POST] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
