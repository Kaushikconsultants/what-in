import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, logApiRequest } from "@/lib/apiKeyAuth";
import { sendWhatsAppTemplateAction } from "@/app/actions/whatsAppPlatformActions";

/**
 * POST /api/v1/messages/send-template
 * Developer API to send pre-approved Meta WhatsApp templates.
 * Required Scope: "messages:send"
 *
 * Request Body:
 * {
 *   "to": "919876543210" or "+91 98765 43210",
 *   "templateName": "welcome_brochure",
 *   "languageCode": "en_US" (optional, default: en_US),
 *   "components": [ ... ] (optional dynamic variables, headers, or buttons)
 * }
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const auth = await validateApiKey(req, "messages:send");

  if (!auth.authenticated || !auth.client) {
    logApiRequest({
      endpoint: "/api/v1/messages/send-template",
      httpMethod: "POST",
      statusCode: auth.statusCode || 401,
      responseTimeMs: Date.now() - startTime,
      errorMessage: auth.error,
    });
    return NextResponse.json(
      { success: false, error: auth.error || "Unauthorized." },
      { status: auth.statusCode || 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { to, templateName, languageCode = "en_US", components = [] } = body;

    if (!to || !to.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing required field: 'to' (recipient phone number)." },
        { status: 400 }
      );
    }

    if (!templateName || !templateName.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing required field: 'templateName'." },
        { status: 400 }
      );
    }

    const cleanPhone = to.toString().replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number format. Must contain at least 10 digits." },
        { status: 400 }
      );
    }

    // Dispatch template via core platform engine
    const res = await sendWhatsAppTemplateAction(
      cleanPhone,
      templateName.trim(),
      languageCode,
      components,
      undefined,
      "Developer API"
    );

    const isSuccess = Boolean(res?.success);
    const statusCode = isSuccess ? 200 : 400;

    logApiRequest({
      clientId: auth.client.id,
      apiKeyId: auth.apiKey?.id,
      endpoint: "/api/v1/messages/send-template",
      httpMethod: "POST",
      statusCode,
      responseTimeMs: Date.now() - startTime,
      requestPayloadPreview: JSON.stringify({ to: cleanPhone, templateName, languageCode }),
      errorMessage: isSuccess ? null : res.error,
    });

    if (isSuccess) {
      return NextResponse.json({
        success: true,
        message: "Template dispatched successfully.",
        data: res,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: res.error || "Failed to send template message via Meta WhatsApp API.",
        },
        { status: 400 }
      );
    }
  } catch (err: any) {
    console.error("[API v1 /messages/send-template] Error:", err);
    logApiRequest({
      clientId: auth.client.id,
      apiKeyId: auth.apiKey?.id,
      endpoint: "/api/v1/messages/send-template",
      httpMethod: "POST",
      statusCode: 500,
      responseTimeMs: Date.now() - startTime,
      errorMessage: err.message,
    });
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error." },
      { status: 500 }
    );
  }
}
