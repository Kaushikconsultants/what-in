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

    let finalComponents = Array.isArray(components) ? [...components] : [];

    // 1. Friendly Header Media Support (Documents/PDFs, Images, Videos, Text)
    if (body.headerMedia || body.headerImage || body.headerDocument || body.headerVideo || body.headerText) {
      const hasHeader = finalComponents.some((c: any) => c.type?.toLowerCase() === "header");
      if (!hasHeader) {
        if (body.headerDocument || body.headerMedia?.type === "document") {
          const docUrl = typeof body.headerDocument === "string"
            ? body.headerDocument
            : (body.headerDocument?.link || body.headerDocument?.url || body.headerMedia?.link || body.headerMedia?.url);
          const docFilename = body.headerDocument?.filename || body.headerDocument?.name || body.headerFilename || "Document.pdf";
          if (docUrl) {
            finalComponents.push({
              type: "header",
              parameters: [{
                type: "document",
                document: { link: docUrl, filename: docFilename }
              }]
            });
          }
        } else if (body.headerImage || body.headerMedia?.type === "image") {
          const imgUrl = typeof body.headerImage === "string"
            ? body.headerImage
            : (body.headerImage?.link || body.headerImage?.url || body.headerMedia?.link || body.headerMedia?.url);
          if (imgUrl) {
            finalComponents.push({
              type: "header",
              parameters: [{
                type: "image",
                image: { link: imgUrl }
              }]
            });
          }
        } else if (body.headerVideo || body.headerMedia?.type === "video") {
          const vidUrl = typeof body.headerVideo === "string"
            ? body.headerVideo
            : (body.headerVideo?.link || body.headerVideo?.url || body.headerMedia?.link || body.headerMedia?.url);
          if (vidUrl) {
            finalComponents.push({
              type: "header",
              parameters: [{
                type: "video",
                video: { link: vidUrl }
              }]
            });
          }
        } else if (body.headerText) {
          finalComponents.push({
            type: "header",
            parameters: [{
              type: "text",
              text: String(body.headerText)
            }]
          });
        }
      }
    }

    // 2. Friendly Body Variables Support (e.g. bodyVariables: ["Aman", "ORD-1002", "₹1,499"])
    if (body.bodyVariables || body.parameters) {
      const rawVars = body.bodyVariables || body.parameters;
      const hasBody = finalComponents.some((c: any) => c.type?.toLowerCase() === "body");
      if (!hasBody) {
        if (Array.isArray(rawVars)) {
          finalComponents.push({
            type: "body",
            parameters: rawVars.map((v: any) => ({
              type: "text",
              text: typeof v === "object" ? String(v.text || "") : String(v)
            }))
          });
        } else if (typeof rawVars === "object") {
          const sortedKeys = Object.keys(rawVars).sort((a, b) => Number(a) - Number(b));
          finalComponents.push({
            type: "body",
            parameters: sortedKeys.map((k) => ({
              type: "text",
              text: String(rawVars[k])
            }))
          });
        }
      }
    }

    // 3. Friendly Interactive Buttons Support (URL tracking suffix, quick reply payload, coupon code)
    if (body.buttonPayload || body.buttonUrlSuffix || body.couponCode) {
      if (body.buttonPayload) {
        finalComponents.push({
          type: "button",
          sub_type: "quick_reply",
          index: String(body.buttonIndex || 0),
          parameters: [{ type: "payload", payload: String(body.buttonPayload) }]
        });
      }
      if (body.buttonUrlSuffix) {
        finalComponents.push({
          type: "button",
          sub_type: "url",
          index: String(body.buttonIndex || 0),
          parameters: [{ type: "text", text: String(body.buttonUrlSuffix) }]
        });
      }
      if (body.couponCode) {
        finalComponents.push({
          type: "button",
          sub_type: "copy_code",
          index: String(body.buttonIndex || 0),
          parameters: [{ type: "coupon_code", coupon_code: String(body.couponCode) }]
        });
      }
    }

    // Dispatch template via core platform engine
    const res = await sendWhatsAppTemplateAction(
      cleanPhone,
      templateName.trim(),
      languageCode,
      finalComponents,
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
