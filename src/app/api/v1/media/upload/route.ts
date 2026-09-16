import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey, logApiRequest } from "@/lib/apiKeyAuth";
import { getAuthenticatedUser } from "@/lib/authSession";
import { checkRateLimit, withRateLimitHeaders } from "@/lib/rateLimiter";
import { getMetaApiCredentials } from "@/app/actions/whatsAppPlatformActions";

async function resolveClient(req: NextRequest) {
  const auth = await validateApiKey(req, "messages:send");
  if (auth.authenticated && auth.client) {
    return { client: auth.client, apiKey: auth.apiKey };
  }

  const user = await getAuthenticatedUser(req);
  if (user?.clientId) {
    const client = await prisma.whatsAppClient.findUnique({ where: { id: user.clientId } });
    if (client) return { client, apiKey: null };
  }

  const fallback = await prisma.whatsAppClient.findFirst({ orderBy: { createdAt: "asc" } });
  return { client: fallback, apiKey: null };
}

/**
 * POST /api/v1/media/upload
 * Direct WhatsApp Cloud API Media Upload
 * Uploads media (images, pdfs, audio, video) to Meta WhatsApp servers and returns a media ID.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const { client, apiKey } = await resolveClient(req);

  if (!client) {
    return NextResponse.json({ success: false, error: "Unauthorized. Missing or invalid API key." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(apiKey?.id || client.id, 60, 60);
  if (!rateLimit.allowed) {
    return withRateLimitHeaders(
      NextResponse.json({ success: false, error: "Rate limit exceeded. Try again in " + rateLimit.retryAfter + " seconds." }, { status: 429 }),
      rateLimit
    );
  }

  try {
    const creds = await getMetaApiCredentials();
    const phoneId = client.phoneId || creds.phoneId;
    const token = client.metaAccessToken || creds.accessToken;

    if (!phoneId || !token) {
      return NextResponse.json(
        { success: false, error: "WhatsApp credentials (phoneId and metaAccessToken) are not configured." },
        { status: 400 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    let metaFormData = new FormData();
    let originalFilename = "media_file";
    let mimeType = "image/jpeg";

    if (contentType.includes("multipart/form-data")) {
      const incomingFormData = await req.formData();
      const file = incomingFormData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ success: false, error: "Missing 'file' field in multipart form data." }, { status: 400 });
      }

      originalFilename = file.name;
      mimeType = file.type || "application/octet-stream";

      metaFormData.append("messaging_product", "whatsapp");
      metaFormData.append("file", file, file.name);
      metaFormData.append("type", mimeType);
    } else {
      // JSON body with remote url
      const body = await req.json().catch(() => ({}));
      const mediaUrl = body.url || body.mediaUrl;

      if (!mediaUrl) {
        return NextResponse.json(
          { success: false, error: "Provide either multipart/form-data with 'file' or JSON body with 'url'." },
          { status: 400 }
        );
      }

      // Fetch the remote file
      const fetchResp = await fetch(mediaUrl);
      if (!fetchResp.ok) {
        return NextResponse.json({ success: false, error: `Failed to download file from url: ${fetchResp.statusText}` }, { status: 400 });
      }

      const blob = await fetchResp.blob();
      mimeType = body.mimeType || fetchResp.headers.get("content-type") || "application/octet-stream";
      originalFilename = body.filename || mediaUrl.split("/").pop() || "downloaded_file";

      metaFormData.append("messaging_product", "whatsapp");
      metaFormData.append("file", blob, originalFilename);
      metaFormData.append("type", mimeType);
    }

    // Dispatch directly to Meta Graph API
    const metaResp = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/media`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: metaFormData,
    });

    const metaData = await metaResp.json();

    if (!metaResp.ok || !metaData.id) {
      logApiRequest({
        clientId: client.id,
        apiKeyId: apiKey?.id,
        endpoint: "/api/v1/media/upload",
        httpMethod: "POST",
        statusCode: metaResp.status,
        responseTimeMs: Date.now() - startTime,
        errorMessage: metaData.error?.message || "Meta upload failed",
      });

      return NextResponse.json(
        { success: false, error: metaData.error?.message || "Failed to upload media to WhatsApp.", metaDetails: metaData },
        { status: metaResp.status }
      );
    }

    logApiRequest({
      clientId: client.id,
      apiKeyId: apiKey?.id,
      endpoint: "/api/v1/media/upload",
      httpMethod: "POST",
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
      requestPayloadPreview: `Uploaded media: ${originalFilename} -> ${metaData.id}`,
    });

    return withRateLimitHeaders(
      NextResponse.json({
        success: true,
        mediaId: metaData.id,
        filename: originalFilename,
        mimeType,
        messaging_product: "whatsapp",
      }),
      rateLimit
    );
  } catch (err: any) {
    console.error("[Media Upload API Error]:", err);
    logApiRequest({
      clientId: client.id,
      apiKeyId: apiKey?.id,
      endpoint: "/api/v1/media/upload",
      httpMethod: "POST",
      statusCode: 500,
      responseTimeMs: Date.now() - startTime,
      errorMessage: err.message,
    });

    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
