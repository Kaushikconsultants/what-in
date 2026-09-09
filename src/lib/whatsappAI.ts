import { PrismaClient } from '@prisma/client';
import { sendWhatsAppMessageAction } from '@/app/actions/whatsAppPlatformActions';

const prisma = new PrismaClient();

const SHOPIFY_STORE_URL = process.env.VITE_SHOPIFY_STORE_URL || 'i2tu0d-jc.myshopify.com';
const SHOPIFY_ACCESS_TOKEN = process.env.VITE_SHOPIFY_ACCESS_TOKEN || '';

// Mock AI call (You can use @google/genai or fetch in real app)

export const GEMINI_MODEL_CASCADE = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3.1-pro-preview',
  'gemini-2.0-flash'
];

export async function callGeminiRest(apiKey: string, modelName: string, prompt: string, systemPrompt: string, maxTokens = 600) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Gemini API Key is not configured in Settings.');
  }

  const cleanKey = apiKey.trim().replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '').trim();
  const isBearer = cleanKey.startsWith('ya29.');
  const url = isBearer
    ? `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`
    : `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(cleanKey)}`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (isBearer) {
    headers['Authorization'] = `Bearer ${cleanKey}`;
  } else {
    headers['x-goog-api-key'] = cleanKey;
  }

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4 }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API error ${res.status}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text.trim();
}

async function callAIEngine(messages: any[], preferredModel: string, jsonMode = false, maxTokens = 600) {
  let apiKey = process.env.GEMINI_API_KEY || '';
  try {
    const settings = await prisma.whatsAppSettings.findFirst();
    if (settings?.geminiApiKey) apiKey = settings.geminiApiKey;
  } catch (_) {}

  if (!apiKey) {
    throw new Error('No Gemini API Key found in settings or environment.');
  }

  const systemMsg = messages.find((m: any) => m.role === 'system')?.content || '';
  const userMsgs = messages.filter((m: any) => m.role !== 'system').map((m: any) => (m.role === 'user' ? 'Customer: ' : 'Agent: ') + m.content).join('\n');

  const cascade = [
    preferredModel,
    ...GEMINI_MODEL_CASCADE.filter(m => m !== preferredModel)
  ];

  let lastError = '';
  for (const model of cascade) {
    try {
      console.log('[AI] Querying Gemini model:', model);
      return await callGeminiRest(apiKey, model, userMsgs, systemMsg, maxTokens);
    } catch (err: any) {
      lastError = err.message;
      console.warn(`[AI] Model failed (${model}):`, err.message);
    }
  }
  throw new Error(`All Gemini cascade models failed. Last error: ${lastError}`);
}

export async function lookupOrder(orderNumber: string, senderPhone = '', userText = '', history = '') {
  const pureNum = String(orderNumber || '').replace(/[^0-9]/g, '');
  const cleanSender = String(senderPhone || '').replace(/\D/g, '').slice(-10);

  try {
    let order: any = null;

    if (pureNum) {
      const url = `https://${SHOPIFY_STORE_URL}/admin/api/2024-10/orders.json?status=any&name=${pureNum}`;
      const res = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      const orders = data.orders || [];
      if (orders.length > 0) order = orders[0];
    }

    if (!order) {
      return { error: `No matching order found in store for ${pureNum ? '#' + pureNum : cleanSender}.` };
    }

    const registeredPhone = order.phone || order.customer?.phone || order.shipping_address?.phone || cleanSender || '';
    const order10Digits = String(registeredPhone).replace(/[^0-9]/g, '').slice(-10);

    const destination_location = `${order.shipping_address?.city || 'India'}, ${order.shipping_address?.province || ''} - ${order.shipping_address?.zip || ''}`.replace(/^[,\s-]+|[,\s-]+$/g, '') || 'India';
    const courier_company = order.fulfillments?.[0]?.tracking_company || 'Express Delivery';
    const tracking_url = order.fulfillments?.[0]?.tracking_url || order.fulfillments?.[0]?.tracking_urls?.[0] || 'https://www.icarry.in';
    const rawStatus = order.fulfillment_status || 'unfulfilled';
    const readableStatus = rawStatus === 'fulfilled' ? 'FULFILLED / SHIPPED (In Transit)' : rawStatus.toUpperCase();

    const finStatus = (order.financial_status || '').toLowerCase();
    const totalAmount = `₹${order.total_price || 0}`;
    const payment_status = finStatus === 'paid'
      ? `💳 PAID ONLINE (Prepaid - ${totalAmount})`
      : finStatus === 'partially_paid'
      ? `🪙 PARTIALLY PAID (Advance Paid | Balance to Pay on COD: ${totalAmount})`
      : `💵 CASH ON DELIVERY (COD | Please Pay ${totalAmount} on Delivery)`;

    return {
      order_number: order.name,
      registered_mobile_10_digits: order10Digits || 'No mobile registered',
      status: readableStatus,
      payment_status,
      financial_status: order.financial_status,
      total_price: totalAmount,
      destination_location,
      courier_company,
      tracking_url,
      CRITICAL_INSTRUCTION_TO_AI: `You MUST compare Customer ka Current WhatsApp Number or Customer ka bataya hua 10-digit number with registered_mobile_10_digits (${order10Digits}). If they DO NOT MATCH exactly, DO NOT reveal status or tracking_url! When answering order status, ALWAYS clearly state the payment_status (${payment_status}) and order status. Never output JSON in your reply!`
    };
  } catch (err: any) {
    return { error: err.message };
  }
}

function extractProductKeyword(text: string) {
  if (/combo|trio|pack|offer|deal|discount/i.test(text)) {
    if (!/short|oversize|t\-?i?shirt|shirt|tee|pant|track/i.test(text)) return '';
  }
  const terms = [];
  if (/short/i.test(text)) terms.push('shorts');
  if (/oversize|t\-?i?shirt|shirt|tee/i.test(text)) terms.push('shirt');
  if (/pant|track|lower|trouser/i.test(text)) terms.push('pant');
  return terms.join(' ');
}

export async function searchProducts(userText: string) {
  const isComboSearch = /combo|trio|pack|offer|deal|discount/i.test(userText);
  const dbCombos = await prisma.shopifyCombo.findMany({ where: { is_active: true } });

  // Get active settings to find the store domain
  let activeDomain = SHOPIFY_STORE_URL;
  try {
    const settings = await prisma.companySettings.findFirst();
    if (settings && settings.shopifyStoreDomain) {
      activeDomain = settings.shopifyStoreDomain;
    }
  } catch (_) {}

  // 1. Fetch all unique collection titles from database
  let matchedCollection = "";
  try {
    const activeProducts = await prisma.product.findMany({
      where: { status: "Active" },
      select: { fabric: true }
    });
    const allCollections = Array.from(
      new Set(
        activeProducts
          .map(p => p.fabric)
          .flatMap(f => String(f || '').split(',').map(s => s.trim()))
          .filter(Boolean)
      )
    );

    // Look for exact/partial collection name matches in the userText
    for (const col of allCollections) {
      if (col.length > 2 && new RegExp(`\\b${col}\\b|\\b${col.replace(/\\s+/g, '')}\\b`, 'i').test(userText)) {
        matchedCollection = col;
        break;
      }
    }
  } catch (_) {}

  let dbProducts = [];
  try {
    if (matchedCollection) {
      console.log(`[AI Sync Search] User requested collection: ${matchedCollection}`);
      dbProducts = await prisma.product.findMany({
        where: {
          status: "Active",
          fabric: { contains: matchedCollection, mode: 'insensitive' }
        },
        take: 10
      });
    } else {
      // Search terms fallback (Shirts, Pants, etc.)
      const terms = [];
      if (/short/i.test(userText)) terms.push('short');
      if (/oversize|t\-?i?shirt|shirt|tee/i.test(userText)) terms.push('shirt');
      if (/pant|track|lower|trouser/i.test(userText)) terms.push('pant');
      if (/watch/i.test(userText)) terms.push('watch');

      if (terms.length > 0) {
        dbProducts = await prisma.product.findMany({
          where: {
            status: "Active",
            OR: terms.map(term => ({
              OR: [
                { name: { contains: term, mode: 'insensitive' } },
                { description: { contains: term, mode: 'insensitive' } },
                { category: { contains: term, mode: 'insensitive' } }
              ]
            }))
          },
          take: 10
        });
      } else {
        // General keyword matching
        const words = userText.split(/\s+/).filter(w => w.length > 3 && !/what|show|price|suggest|recommend|need|want|find/i.test(w));
        if (words.length > 0) {
          dbProducts = await prisma.product.findMany({
            where: {
              status: "Active",
              OR: words.map(w => ({
                OR: [
                  { name: { contains: w, mode: 'insensitive' } },
                  { description: { contains: w, mode: 'insensitive' } },
                  { category: { contains: w, mode: 'insensitive' } },
                  { fabric: { contains: w, mode: 'insensitive' } }
                ]
              }))
            },
            take: 10
          });
        } else {
          // Return top active products
          dbProducts = await prisma.product.findMany({
            where: { status: "Active" },
            take: 10
          });
        }
      }
    }

    // Sort by combos first
    dbProducts.sort((a: any, b: any) => {
      const aCombo = dbCombos.find(c => c.product_title && a.name.toLowerCase().includes(c.product_title.toLowerCase()));
      const bCombo = dbCombos.find(c => c.product_title && b.name.toLowerCase().includes(c.product_title.toLowerCase()));
      return (bCombo ? 1 : 0) - (aCombo ? 1 : 0);
    });

    const productLines: string[] = [];
    const carouselCards: any[] = [];

    dbProducts.forEach((p: any, idx: number) => {
      const singlePrice = p.sellingPrice || 0;
      const matchingCombo = dbCombos.find(c => c.product_title && p.name.toLowerCase().includes(c.product_title.toLowerCase()));
      let comboLine = '';
      let cardPrice = `₹${singlePrice}`;
      const handle = p.subCategory || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      let productUrl = `https://${activeDomain}/products/${handle}`;

      if (matchingCombo && Number(matchingCombo.combo_count) > 0) {
        comboLine = ` | 🔥 *COMBO OFFER:* Pack of ${matchingCombo.combo_count} @ *₹${matchingCombo.combo_price}* (Coupon: *${matchingCombo.discount_code}*)`;
        cardPrice = `COMBO: Pack of ${matchingCombo.combo_count} @ ₹${matchingCombo.combo_price}`;
        productUrl = `https://${activeDomain}/products/${handle}?discount=${matchingCombo.discount_code}`;
      }

      if (idx < 5) {
        // Build clean title without repeating size in name — show size from dedicated field
        const sizeLabel = p.size ? ` (${p.size})` : '';
        const cleanTitle = p.name.replace(/\s*[-–]?\s*(M\s*to\s*X{1,3}L?|S\s*to\s*X{1,3}L?|\bXL\b|\bXXL\b|\bXXXL\b)[\s,]*/gi, '').trim();
        productLines.push(`Product: ${p.name} - Price: ₹${singlePrice} ${comboLine}`);
        carouselCards.push({
          title: cleanTitle + sizeLabel,
          price: cardPrice,
          image_url: p.images?.[0] || '',
          url: productUrl
        });
      }
    });

    let textLines = productLines;
    if (isComboSearch && dbCombos.length > 0) {
      const summaryList = dbCombos.map(c => `🔥 *${c.product_title}* — Pack of ${c.combo_count} @ *₹${c.combo_price}* (Coupon: *${c.discount_code}*)`);
      textLines = [...summaryList, '', ...productLines];
    }

    return { textLines, carouselCards };
  } catch (err: any) {
    console.error("[searchProducts Error]:", err.message);
    return { error: err.message };
  }
}

export function recommendSize(userText: string) {
  const brandName = process.env.BRAND_NAME || 'Espon';
  const weightMatch = userText.match(/(?:weight\s*is\s*|weight\s*|wt\s*|@\s*|^|\D)(\d{2,3})\s*(?:kg|kilo|k)\b/i) || userText.match(/\b(\d{2,3})\s*(?:kg|kilo)\b/i);
  const waistMatch = userText.match(/(?:waist|kamar)\s*(?:is\s*|of\s*|=|-|:)?\s*(\d{2})\b/i) || userText.match(/\b(\d{2})\s*(?:waist|kamar|inch|in)\b/i);

  if (weightMatch) {
    const kg = parseInt(weightMatch[1], 10);
    let teeSize = 'M (Medium)'; let teeChest = '44"'; let bottomSize = 'L (30-32" waist)';
    if (kg < 60) { teeSize = 'S (Small)'; teeChest = '42"'; bottomSize = 'M (28-30" waist)'; }
    else if (kg <= 72) { teeSize = 'M (Medium)'; teeChest = '44"'; bottomSize = 'M or L (29-31" waist)'; }
    else if (kg <= 84) { teeSize = 'L (Large)'; teeChest = '46"'; bottomSize = 'L or XL (31-33" waist)'; }
    else if (kg <= 95) { teeSize = 'XL (Extra Large)'; teeChest = '48"'; bottomSize = 'XL or XXL (33-35" waist)'; }
    else { teeSize = 'XXL (Double XL)'; teeChest = '50"'; bottomSize = 'XXL (35-37" waist)'; }

    return `[${brandName.toUpperCase()} SIZE RECOMMENDATION FOR WEIGHT ~${kg} KG]:\n` +
      `👕 Oversized T-Shirts: Recommended Size **${teeSize}** (Chest ${teeChest} | Premium Boxy Fit)\n` +
      `🩳 Shorts & Track Pants: Recommended Size **${bottomSize}**\n` +
      `💡 Note: Our tees already have a stylish drop-shoulder oversized streetwear cut — no need to size up!`;
  }
  if (waistMatch) {
    const waist = parseInt(waistMatch[1], 10);
    let bottomSize = 'M (Medium - 28-30")';
    if (waist >= 35) bottomSize = 'XXL (Double XL - 34-36"+)';
    else if (waist >= 33) bottomSize = 'XL (Extra Large - 32-34")';
    else if (waist >= 31) bottomSize = 'L (Large - 30-32")';

    return `[${brandName.toUpperCase()} SIZE RECOMMENDATION FOR ~${waist}" WAIST]:\n` +
      `🩳 Recommended Bottom Size: **${bottomSize}**\n` +
      `👕 For Oversized Tees: Choose based on chest/weight (M for 65-75kg, L for 75-85kg).`;
  }
  return `[${brandName.toUpperCase()} GENERAL SIZE & FIT GUIDE]:\n` +
    `👕 Oversized T-Shirts:\n` +
    `   • S: Chest 42" (~50-63 kg)\n   • M: Chest 44" (~63-73 kg)\n   • L: Chest 46" (~74-84 kg)\n   • XL: Chest 48" (~85-95 kg)\n   • XXL: Chest 50" (~96-110 kg)\n` +
    `🩳 Shorts/Tracks: M (28-30"), L (30-32"), XL (32-34"), XXL (34-36"+)`;
}

export async function sendWhatsAppProductCards(toPhone: string, cards: any[]) {
  let phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '1189183190949431';
  let token = process.env.WHATSAPP_TOKEN || '';
  
  const account = await prisma.whatsAppAccount.findFirst({ where: { accessToken: { not: null } } });
  if (account && account.phoneId && account.accessToken) {
    phoneId = account.phoneId;
    token = account.accessToken;
  } else {
    const settings = await prisma.whatsAppLegacySetting.findFirst();
    if (settings?.whatsapp_token) token = settings.whatsapp_token;
  }

  if (!token) return;

  const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`;
  const cardsToSend = cards.slice(0, 5);
  
  for (const c of cardsToSend) {
    const fallbackImage = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/1024px-No_image_available.svg.png";
    const imageUrl = c.image_url || fallbackImage;
    // Caption without Buy Now link (link goes in button)
    const caption = `*${c.title}*\nPrice: ${c.price}`.slice(0, 1024);

    // Combine Image, Title, Price, and Buy Now button into a single interactive message
    const combinedPayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: toPhone,
      type: "interactive",
      interactive: {
        type: "cta_url",
        header: {
          type: "image",
          image: { link: imageUrl }
        },
        body: { text: caption },
        action: {
          name: "cta_url",
          parameters: {
            display_text: "🛍️ Buy Now",
            url: c.url
          }
        }
      }
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(combinedPayload)
      });
      if (!res.ok) {
        const errorText = await res.text();
        // If CTA button fails, fall back to Image with caption, then text link
        if (errorText.includes('unsupported') || errorText.includes('invalid')) {
          const fallbackImagePayload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: toPhone,
            type: "image",
            image: {
              link: imageUrl,
              caption: caption
            }
          };
          await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(fallbackImagePayload)
          });

          await new Promise(r => setTimeout(r, 200));

          const fallbackTextPayload = {
            messaging_product: "whatsapp",
            to: toPhone,
            type: "text",
            text: { body: `🛍️ Buy Now: ${c.url}` }
          };
          await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(fallbackTextPayload)
          });
        } else {
          console.error("[sendWhatsAppProductCards Combined Error]:", errorText);
        }
      }
      await new Promise(r => setTimeout(r, 400));
    } catch (err: any) {
      console.error("[sendWhatsAppProductCards Combined Catch]:", err.message);
    }
  }
}

export async function handleIncomingAILogic(senderPhone: string, userText: string, historyLines: string[], conversationId?: string) {
  let brandName = "Espon Clothing";
  let brandDomain = "www.espon.in";
  let brandPhone = "+91 7206066678";
  let brandEmail = "clothingespon@gmail.com";
  let brandAddress = "Rohtak, Haryana, India";
  let gstin = "06AAHCE7721Q1Z4";

  let settings: any = null;
  let legacySetting: any = null;
  let activeCombos: any[] = [];

  try {
    const [company, s, acc, legacy, combos] = await Promise.all([
      prisma.companySettings.findFirst().catch(() => null),
      prisma.whatsAppSettings.findFirst().catch(() => null),
      prisma.whatsAppAccount.findFirst().catch(() => null),
      prisma.whatsAppLegacySetting.findFirst().catch(() => null),
      prisma.shopifyCombo.findMany({ where: { is_active: true }, take: 4 }).catch(() => [])
    ]);
    settings = s;
    legacySetting = legacy;
    activeCombos = combos;

    if (company?.companyName) brandName = company.companyName;
    else if (acc?.name) brandName = acc.name;

    if (company?.shopifyStoreDomain) {
      brandDomain = company.shopifyStoreDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    } else if (company?.website) {
      brandDomain = company.website.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    }

    if (company?.mobile) brandPhone = company.mobile;
    else if (acc?.phoneNumber) brandPhone = acc.phoneNumber;

    if (company?.email) brandEmail = company.email;
    if (company?.address) brandAddress = `${company.address}, ${company.city || ''}, ${company.state || ''} ${company.pincode || ''}`.replace(/\s+,/g, ',').trim();
    if (company?.gstin) gstin = company.gstin;
  } catch (_) {}

  const history = historyLines.join('\n');
  let toolContext = '';
  let carouselCards: any[] = [];
  
  const digitsOnly = userText.replace(/[^0-9]/g, '');
  let orderNumToLookup = null;
  if (digitsOnly.length >= 10) {
    const historyOrderMatch = history.match(/(?:#|order\s*)([12]\d{3})\b/i) || history.match(/\b([12]\d{3})\b/);
    if (historyOrderMatch) orderNumToLookup = historyOrderMatch[1];
  } else {
    const explicitOrderMatch = userText.match(/(?:order|#)\s*([12]\d{3})\b/i);
    if (explicitOrderMatch) orderNumToLookup = explicitOrderMatch[1];
    else {
      const standaloneMatch = userText.match(/(?:^|\D)([12]\d{3})(?:\D|$)/);
      if (standaloneMatch) orderNumToLookup = standaloneMatch[1];
    }
  }

  if (orderNumToLookup) {
    const orderInfo = await lookupOrder(orderNumToLookup, senderPhone, userText, history);
    toolContext += `\n[SHOPIFY ORDER RESULT FOR #${orderNumToLookup}]: ${JSON.stringify(orderInfo)}`;
  }

  const productKeywords = /short|combo|trio|pack|t\-?shirt|shirt|oversize|tee|pant|track|lower|trouser|clothes|dikhao|price|offer|deal|discount|buy|link|item|product|collection|catalog|sell|shop|store|show/i;
  if (productKeywords.test(userText)) {
    const productsInfo = await searchProducts(userText);
    if (productsInfo && productsInfo.textLines) {
      toolContext += `\n[SHOPIFY GRAPHQL PRODUCTS RESULT]: ${JSON.stringify(productsInfo.textLines)}`;
      carouselCards = productsInfo.carouselCards || [];
    }
  }

  if (/size|fit|height|weight|wt\b|lamba|inch|cm|kg|kilo|medium|large|small|xl|xxl|5['']?\d|6['']?\d|waist|kamar|seena|chest/i.test(userText)) {
    const sizeInfo = recommendSize(userText);
    toolContext += `\n${sizeInfo}`;
  }

  const systemRules = settings?.aiSystemPrompt || "You are an elite sales, customer service, and stylist assistant.";
  const kbPieces: string[] = [];
  if (settings?.aiKnowledgeBase) kbPieces.push(settings.aiKnowledgeBase);
  if (legacySetting?.knowledge_base) kbPieces.push(legacySetting.knowledge_base);
  if (legacySetting?.inst_brand_policies) kbPieces.push(`Policies: ${legacySetting.inst_brand_policies}`);
  const knowledgeBase = kbPieces.join('\n\n') || "Leading apparel brand with premium fabrics, fast nationwide delivery, GST invoicing, and easy returns.";

  const activeCombosStr = activeCombos.length > 0 
    ? activeCombos.map(c => `• ${c.combo_name || 'Combo Pack'} @ ₹${c.combo_price || 'Special Price'} (Code: ${c.discount_code || 'COMBO'})`).join('\n')
    : "• Festive Pack: Use code FLAT30 at checkout.";

  const systemPrompt = `Tum "${brandName} AI Stylist & Sales Assistant" ho!

=== 🏢 DYNAMIC BRAND IDENTITY & CONTACT DETAILS ===
- Brand Name: "${brandName}"
- Official Website / Online Store: "https://${brandDomain}"
- Customer Support Phone / WhatsApp: "${brandPhone}"
- Support Email: "${brandEmail}"
- Business Location: "${brandAddress}"
- GSTIN: "${gstin}"

=== 🤖 AI PERSONA & SYSTEM RULES ===
${systemRules}

=== 🗣️ DYNAMIC LANGUAGE & TONE MIRRORING ===
- Start the conversation in Professional English. If the customer speaks another language (like Hindi/Hinglish), smoothly adapt and respond in their language.
- Provide a helpful, natural, and complete response without suddenly cutting off. Do NOT output any internal thoughts, markdown formatting, bullet points, or prefixes (like "Reply:" or "2-4 lines:"). Output ONLY the final raw text to be sent.

=== 🏢 B2B FOCUS (WHOLESALE & RETAIL) ===
- We cater to B2B wholesalers, retailers, boutique owners as well as direct retail shoppers. Provide GST invoicing and bulk discounts when asked.

=== 🔥 ACTIVE PROMOTIONS & DISCOUNT CODES ===
${activeCombosStr}

=== 🔐 CUSTOMER LIVE WHATSAPP NUMBER ===
Customer ka Current WhatsApp Number: ${senderPhone}

=== 🚨 CRITICAL CHAT RULES ===
1. NEVER output JSON or bracketed tool results directly.
2. If you are showing or suggesting products from the tools data, you MUST append exactly the string "[SEND_PRODUCT_CAROUSEL]" at the very end of your message. Do not forget this tag!

=== 📚 BUSINESS KNOWLEDGE BASE ===
${knowledgeBase}

RECENT CONVERSATION HISTORY:
${history}

TOOLS DATA (USE THIS TO ANSWER):
${toolContext}

CUSTOMER NEW MESSAGE:
${userText}`;

  try {
    const preferredModel = settings?.aiModel || "gemini-2.0-flash";
    let aiReply = await callAIEngine(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText }
      ],
      preferredModel, false, 2000
    );

    let sendCarousel = carouselCards.length > 0;
    if (aiReply.includes('[SEND_PRODUCT_CAROUSEL]')) {
       aiReply = aiReply.replace(/\[SEND_PRODUCT_CAROUSEL\]/g, '').trim();
       sendCarousel = true;
    }

    let targetConversationId = conversationId;
    if (!targetConversationId || targetConversationId === "internal-ai-hook") {
      const cleanPhone = senderPhone.replace(/\D/g, '');
      const conversation = await prisma.whatsAppConversation.findFirst({
        where: {
          customer: {
            OR: [
              { whatsappNumber: { contains: cleanPhone } },
              { mobile: { contains: cleanPhone } }
            ]
          }
        }
      });
      if (conversation) {
        targetConversationId = conversation.id;
      }
    }

    if (aiReply && targetConversationId && targetConversationId !== "internal-ai-hook") {
      await sendWhatsAppMessageAction({
        conversationId: targetConversationId,
        senderId: "system",
        senderType: "AI", 
        messageType: "TEXT",
        content: aiReply,
        senderName: "AI Assistant",
        isInternalNote: false
      }).catch(e => {
        console.error("[AI System Send Error]:", e.message);
      });
    }

    if (sendCarousel && carouselCards.length > 0) {
      await sendWhatsAppProductCards(senderPhone, carouselCards);
    }
    
    // Background Tagging Task
    callAIEngine([{ role: 'system', content: 'Output exactly one tag describing the customer intent: [VIP, Angry, Inquiry, Looking to Buy]' }, { role: 'user', content: userText }], preferredModel, false, 15)
      .then(async tag => {
        // Tagging logic can be attached to Customer or Conversation 
      }).catch(()=>{});

    return aiReply;
  } catch (err: any) {
    console.error("[WhatsApp AI] Generation failed:", err.message);
    throw err;
  }
}


