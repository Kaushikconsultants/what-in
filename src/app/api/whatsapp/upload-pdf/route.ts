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
    try {
      const pdfModule: any = await import('pdf-parse');
      const ParserClass = pdfModule.PDFParse || pdfModule.default?.PDFParse;
      
      // Configure inlined worker Data URL to prevent missing pdf.worker.mjs chunk error in standalone builds
      if (ParserClass?.setWorker) {
        try {
          const workerModule: any = await import('pdf-parse/worker');
          if (typeof workerModule.getData === 'function') {
            const workerData = workerModule.getData();
            if (workerData) {
              ParserClass.setWorker(workerData);
            }
          } else if (typeof workerModule.getPath === 'function') {
            const { pathToFileURL } = await import('url');
            ParserClass.setWorker(pathToFileURL(workerModule.getPath()).href);
          }
        } catch (workerErr) {
          console.warn('PDF worker setup notice:', workerErr);
        }
      }

      if (ParserClass) {
        const parser = new ParserClass({ data: buffer });
        const data = await parser.getText();
        extractedText = data.text || '';
        if (typeof parser.destroy === 'function') {
          await parser.destroy();
        }
      } else if (typeof pdfModule === 'function') {
        const data = await pdfModule(buffer);
        extractedText = data.text || '';
      } else if (typeof pdfModule.default === 'function') {
        const data = await pdfModule.default(buffer);
        extractedText = data.text || '';
      }
    } catch (parseErr: any) {
      console.warn('PDFParse primary extraction failed, trying stream fallback:', parseErr?.message);
      // Fallback: extract plain text directly from stream blocks
      try {
        const raw = buffer.toString('latin1');
        const textMatches: string[] = [];
        const btRegex = /BT[\s\S]*?ET/g;
        let match: RegExpExecArray | null;
        while ((match = btRegex.exec(raw)) !== null) {
          const block = match[0];
          const tjRegex = /\((.*?)\)\s*Tj/g;
          let tjMatch: RegExpExecArray | null;
          while ((tjMatch = tjRegex.exec(block)) !== null) {
            if (tjMatch[1]) textMatches.push(tjMatch[1]);
          }
          const arrayTjRegex = /\[(.*?)\]\s*TJ/g;
          let arrMatch: RegExpExecArray | null;
          while ((arrMatch = arrayTjRegex.exec(block)) !== null) {
            const inner = arrMatch[1];
            const innerItems = inner.match(/\((.*?)\)/g);
            if (innerItems) {
              textMatches.push(innerItems.map((s: string) => s.slice(1, -1)).join(' '));
            }
          }
        }
        extractedText = textMatches.join(' ').replace(/\\([()\\])/g, '$1').trim();
      } catch (_) {}
    }

    if (!extractedText.trim()) {
      // Last-ditch ASCII cleanup if PDF has plain text
      const asciiOnly = buffer.toString('utf8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
      if (asciiOnly.length > 50) {
        extractedText = asciiOnly.slice(0, 10000);
      }
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
