import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    const { default: pdfParse } = await import('pdf-parse/node');
    const data = await pdfParse(buffer);
    const newText = '\n\n--- Source: PDF Upload (' + file.name + ') ---\n' + data.text.trim();
    
    let settings = await prisma.whatsAppSettings.findFirst();
    if (!settings) {
      settings = await prisma.whatsAppSettings.create({ data: {} });
    }
    
    const updatedKnowledgeBase = (settings.aiKnowledgeBase || '') + newText;
    
    await prisma.whatsAppSettings.update({
      where: { id: settings.id },
      data: { aiKnowledgeBase: updatedKnowledgeBase }
    });
    
    return NextResponse.json({ success: true, textExtracted: data.text.length, newKnowledgeBase: updatedKnowledgeBase });
  } catch (err: any) {
    console.error('PDF Upload Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
