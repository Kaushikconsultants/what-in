import { prisma } from "@/lib/prisma";

export interface UpiScreenshotAnalysis {
  isPaymentScreenshot: boolean;
  utrNumber: string | null;
  amount: number | null;
  paymentApp: string | null; // e.g. "PhonePe", "Google Pay", "Paytm", "BHIM", "Cred", "Banking App"
  payeeName: string | null;
  senderName: string | null;
  timestamp: string | null;
  confidence: number; // 0 to 100
  isAuthentic: boolean;
  antiFraudNotes: string;
}

const VISION_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-2.5-flash"
];

export async function analyzeUpiPaymentScreenshot(
  imageBase64: string,
  mimeType: string = "image/jpeg",
  customApiKey?: string
): Promise<UpiScreenshotAnalysis> {
  // 1. Resolve API key
  let apiKey = customApiKey || process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    try {
      const settings = await prisma.whatsAppSettings.findFirst();
      if (settings?.geminiApiKey) apiKey = settings.geminiApiKey;
    } catch (_) {}
  }

  if (!apiKey) {
    throw new Error("Missing Gemini API Key for UPI Vision analysis.");
  }

  const cleanKey = apiKey.trim().replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '').trim();

  // 2. Structured Prompt for Gemini Vision OCR & Fraud Verification
  const prompt = `You are an expert fraud detection and financial OCR system specializing in Indian UPI and banking payments (Google Pay, PhonePe, Paytm, BHIM, Cred, Amazon Pay, and Mobile Banking apps).

Analyze the provided image and determine if it is a payment confirmation receipt/screenshot.
Extract the following information in strict JSON format:
{
  "isPaymentScreenshot": boolean, // true ONLY if this is a genuine payment receipt/successful transaction screen
  "utrNumber": string or null, // 12-digit UPI reference / UTR number (e.g. "423819028371", "331829104820", etc.). Must be pure digits if found.
  "amount": number or null, // Numerical amount paid in INR (e.g. 2000 or 1499.50) without currency symbol
  "paymentApp": string or null, // The app name e.g. "PhonePe", "Google Pay", "Paytm", "BHIM", "Cred", "YONO SBI", "HDFC PayZapp", etc.
  "payeeName": string or null, // The recipient business or person name shown as paid to
  "senderName": string or null, // The customer/sender name or VPA if visible
  "timestamp": string or null, // Date/time string visible on receipt
  "confidence": number, // Confidence score between 0 and 100
  "isAuthentic": boolean, // true if screenshot looks genuine, false if signs of editing, fake template generator, font mismatch, or manipulated text
  "antiFraudNotes": string // Brief reason for authenticity score or detected irregularities
}

CRITICAL RULES:
- UTR/UPI Transaction ID in India is typically a 12-digit number (e.g. "UPI transaction ID: 428190283719" or "UTR: 428190283719"). Locate and extract this precisely.
- Detect fake screenshot generators (common in India: fake Paytm/PhonePe spoof apps often have pixelated headers, mismatched system fonts, missing live tick animations, or unnatural alignment).
- Return ONLY the raw JSON object, without markdown code blocks, backticks, or any conversational text.`;

  // Clean base64 string if it includes data URL prefix
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '').trim();

  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: cleanBase64
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: "application/json"
    }
  };

  let lastError = "";
  for (const model of VISION_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cleanKey)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("Empty response from Gemini Vision");

      // Clean JSON in case markdown fences remain
      const jsonStr = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed: UpiScreenshotAnalysis = JSON.parse(jsonStr);

      // Sanitize 12-digit UTR if present
      if (parsed.utrNumber) {
        const digitsOnly = parsed.utrNumber.replace(/\D/g, '');
        if (digitsOnly.length >= 10) {
          parsed.utrNumber = digitsOnly;
        }
      }

      return parsed;
    } catch (err: any) {
      lastError = err.message;
      console.warn(`[Gemini Vision] Model ${model} failed:`, err.message);
    }
  }

  // Fallback return if AI models could not parse
  return {
    isPaymentScreenshot: false,
    utrNumber: null,
    amount: null,
    paymentApp: null,
    payeeName: null,
    senderName: null,
    timestamp: null,
    confidence: 0,
    isAuthentic: false,
    antiFraudNotes: `Vision analysis failed: ${lastError}`
  };
}
