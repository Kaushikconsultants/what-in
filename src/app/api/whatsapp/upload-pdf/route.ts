import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, isOwnerAuthenticated } from '@/lib/authSession';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const isOwner = isOwnerAuthenticated(req);
    if (!isOwner && (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "MANAGER"))) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let extractedText = '';
    const pdfModule: any = await import('pdf-parse');
    if (typeof pdfModule === 'function') {
      const data = await pdfModule(buffer);
      extractedText = data.text || '';
    } else if (typeof pdfModule.default === 'function') {
      const data = await pdfModule.default(buffer);
      extractedText = data.text || '';
    } else if (pdfModule.PDFParse) {
      const parser = new pdfModule.PDFParse({ data: buffer });
      const data = await parser.getText();
      extractedText = data.text || '';
      if (typeof parser.destroy === 'function') {
        await parser.destroy();
      }
    } else if (pdfModule.default?.PDFParse) {
      const parser = new pdfModule.default.PDFParse({ data: buffer });
      const data = await parser.getText();
      extractedText = data.text || '';
      if (typeof parser.destroy === 'function') {
        await parser.destroy();
      }
    } else {
      throw new Error('PDF parser engine could not be initialized');
    }

    const newText = '\n\n--- Source: PDF Upload (' + file.name + ') ---\n' + extractedText.trim();
    
    let settings = await prisma.whatsAppSettings.findFirst();
    if (!settings) {
      settings = await prisma.whatsAppSettings.create({ data: {} });
    }
    
    const updatedKnowledgeBase = (settings.aiKnowledgeBase || '') + newText;
    
    await prisma.whatsAppSettings.update({
      where: { id: settings.id },
      data: { aiKnowledgeBase: updatedKnowledgeBase }
    });
    
    return NextResponse.json({ success: true, textExtracted: extractedText.length, newKnowledgeBase: updatedKnowledgeBase });
  } catch (err: any) {
    console.error('PDF Upload Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
