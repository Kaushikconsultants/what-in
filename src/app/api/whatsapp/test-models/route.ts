import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GEMINI_MODEL_CASCADE } from '@/lib/whatsappAI';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const key = body.apiKey;
    const model = body.model || 'gemini-3.8-flash';
    return await handleKeyValidation(key, model);
  } catch (err: any) {
    return NextResponse.json({ success: false, valid: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('apiKey') || undefined;
    const model = searchParams.get('model') || 'gemini-3.8-flash';
    return await handleKeyValidation(key, model);
  } catch (err: any) {
    return NextResponse.json({ success: false, valid: false, error: err.message }, { status: 500 });
  }
}

async function handleKeyValidation(providedKey?: string, preferredModel = 'gemini-3.8-flash') {
  let key = providedKey?.trim();

  // If no key was passed in request, look up saved key in database or env
  if (!key) {
    try {
      const settings = await prisma.whatsAppSettings.findFirst();
      if (settings?.geminiApiKey) {
        key = settings.geminiApiKey.trim();
      }
    } catch (_) {}
  }

  if (!key) {
    key = process.env.GEMINI_API_KEY?.trim() || '';
  }

  if (!key) {
    return NextResponse.json({
      success: false,
      valid: false,
      error: 'No Gemini API Key provided. Please enter an API key to test.'
    }, { status: 400 });
  }

  // Clean key of surrounding quotes, accidental 'Bearer ' prefix, and whitespace
  key = key.replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '').trim();

  // Diagnostic: If user pasted a Google OAuth Client ID or Client Secret instead of an API Key
  if (key.includes('.apps.googleusercontent.com') || key.startsWith('GOCSPX-')) {
    return NextResponse.json({
      success: false,
      valid: false,
      code: 400,
      error: 'You entered a Google OAuth Client ID or Client Secret (.apps.googleusercontent.com) instead of a Gemini API key. Gemini does not use Google Sign-In credentials. Please generate a permanent Gemini API Key (starts with AIzaSy) at https://aistudio.google.com/apikey.'
    });
  }

  const isBearer = key.startsWith('ya29.');
  const listUrl = isBearer
    ? 'https://generativelanguage.googleapis.com/v1beta/models'
    : `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (isBearer) {
    headers['Authorization'] = `Bearer ${key}`;
  } else {
    headers['x-goog-api-key'] = key;
  }

  // Step 1: Query Google's models endpoint to verify authentication and project permissions
  let availableModels: string[] = [];
  try {
    const listRes = await fetch(listUrl, { method: 'GET', headers });
    const listData = await listRes.json().catch(() => ({}));

    if (!listRes.ok) {
      let errorMsg = listData?.error?.message || `Google API returned status ${listRes.status}`;
      if (listRes.status === 401) {
        if (key.startsWith('ya29.')) {
          errorMsg = `Your temporary Google OAuth access token (ya29...) has expired. Google OAuth tokens expire in 60 minutes! Please generate a permanent Gemini API Key (starts with AIzaSy...) from Google AI Studio: https://aistudio.google.com/apikey.`;
        } else {
          errorMsg = `Invalid authentication credentials (401). Gemini API requires a permanent API key (starts with AIzaSy...) generated from Google AI Studio (https://aistudio.google.com/apikey). Do NOT use Google Sign-In, OAuth 2.0 Web Client, or temporary tokens.`;
        }
      }

      return NextResponse.json({
        success: false,
        valid: false,
        code: listRes.status,
        error: errorMsg,
        details: listData?.error || null
      });
    }

    if (Array.isArray(listData?.models)) {
      availableModels = listData.models.map((m: any) => String(m.name || '').replace(/^models\//, ''));
    }
  } catch (netErr: any) {
    return NextResponse.json({
      success: false,
      valid: false,
      error: `Network error reaching Google API: ${netErr.message}`
    });
  }

  // Step 2: Test live token generation on the chosen model or cascade
  const testModels = [
    preferredModel,
    ...GEMINI_MODEL_CASCADE.filter(m => m !== preferredModel)
  ];

  let generationSuccess = false;
  let modelWorking = '';
  let generationOutput = '';
  let lastGenError = '';

  for (const m of testModels) {
    try {
      const genUrl = isBearer
        ? `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`
        : `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(key)}`;

      const genRes = await fetch(genUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Reply with the single word "ACTIVE".' }] }],
          generationConfig: { maxOutputTokens: 10, temperature: 0.1 }
        })
      });

      const genData = await genRes.json().catch(() => ({}));
      if (genRes.ok && genData?.candidates?.[0]?.content?.parts?.[0]?.text) {
        generationSuccess = true;
        modelWorking = m;
        generationOutput = genData.candidates[0].content.parts[0].text.trim();
        break;
      } else {
        lastGenError = genData?.error?.message || `Status ${genRes.status}`;
      }
    } catch (e: any) {
      lastGenError = e.message;
    }
  }

  if (generationSuccess) {
    return NextResponse.json({
      success: true,
      valid: true,
      modelTested: modelWorking,
      output: generationOutput,
      availableModelsCount: availableModels.length,
      availableModels: availableModels.slice(0, 10),
      message: `Gemini API key is active and working! Verified live inference with ${modelWorking}.`
    });
  } else {
    return NextResponse.json({
      success: false,
      valid: false,
      error: `Key authenticated with Google, but generation test failed: ${lastGenError}`,
      availableModelsCount: availableModels.length
    });
  }
}
