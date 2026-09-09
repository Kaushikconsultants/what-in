import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as cheerio from 'cheerio';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ success: false, error: 'No URL provided' }, { status: 400 });
    }

    const response = await fetch(url);
    const html = await response.text();
    const ch = cheerio.load(html);

    let extractedText = '';
    ch('h1, h2, h3, p, li').each((_: number, el: any) => {
      const text = ch(el).text().trim();
      if (text.length > 20) {
        extractedText += text + '\n';
      }
    });

    const newText = '\n\n--- Source: Web Scrape (' + url + ') ---\n' + extractedText.trim().slice(0, 10000);

    // Resolve active client from cookies
    const cookieStore = await cookies();
    const wmUserCookie = cookieStore.get("wm_user")?.value || req.cookies.get("wm_user")?.value;
    let clientId: string | null = null;
    
    if (wmUserCookie) {
      try {
        const parsed = JSON.parse(wmUserCookie);
        if (parsed.clientId) {
          clientId = parsed.clientId;
        } else if (parsed.email) {
          const client = await prisma.whatsAppClient.findFirst({
            where: {
              OR: [
                { adminEmail: parsed.email },
                { contactEmail: parsed.email },
                { contactPhone: parsed.phone || parsed.email },
                { ownerWhatsApp: parsed.phone || parsed.email }
              ]
            }
          });
          if (client) clientId = client.id;
        }
      } catch (_) {}
    }

    let updatedKnowledgeBase = '';

    if (clientId) {
      const client = await prisma.whatsAppClient.findUnique({ where: { id: clientId } });
      updatedKnowledgeBase = (client?.aiKnowledgeBase || '') + newText;
      await prisma.whatsAppClient.update({
        where: { id: clientId },
        data: { aiKnowledgeBase: updatedKnowledgeBase }
      });
    } else {
      let settings = await prisma.whatsAppSettings.findFirst();
      if (!settings) {
        settings = await prisma.whatsAppSettings.create({ data: {} });
      }
      updatedKnowledgeBase = (settings.aiKnowledgeBase || '') + newText;
      await prisma.whatsAppSettings.update({
        where: { id: settings.id },
        data: { aiKnowledgeBase: updatedKnowledgeBase }
      });
    }

    return NextResponse.json({ success: true, textExtracted: extractedText.length, newKnowledgeBase: updatedKnowledgeBase });
  } catch (err: any) {
    console.error('Scrape Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

