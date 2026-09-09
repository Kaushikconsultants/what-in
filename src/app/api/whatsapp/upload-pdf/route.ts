import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Dynamically import the Node bundle of pdf-parse to avoid browser polyfill errors
    const pdfParseModule: any = await import('pdf-parse/node');
    const pdfParse = pdfParseModule.default || pdfParseModule;
    const data = await pdfParse(buffer);
    const newText = '\n\n--- Source: PDF Upload (' + file.name + ') ---\n' + data.text.trim();
    
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
    
    return NextResponse.json({ success: true, textExtracted: data.text.length, newKnowledgeBase: updatedKnowledgeBase });
  } catch (err: any) {
    console.error('PDF Upload Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

