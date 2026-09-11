import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as cheerio from 'cheerio';
import { getAuthenticatedUser, isOwnerAuthenticated } from '@/lib/authSession';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const isOwner = isOwnerAuthenticated(req);
    if (!isOwner && (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "MANAGER"))) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ success: false, error: 'No URL provided' }, { status: 400 });
    }

    // SSRF Protection: Ensure URL is public HTTP/HTTPS and not private/internal/cloud metadata
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return NextResponse.json({ success: false, error: 'Invalid protocol. Only HTTP/HTTPS URLs allowed.' }, { status: 400 });
      }
      const host = parsed.hostname.toLowerCase();
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '0.0.0.0' ||
        host === '::1' ||
        host.startsWith('10.') ||
        host.startsWith('192.168.') ||
        host.startsWith('169.254.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
        host.endsWith('.local') ||
        host.endsWith('.internal')
      ) {
        return NextResponse.json({ success: false, error: 'Access to internal network addresses is restricted.' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid URL format.' }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) WhatmoreBot/1.0' },
      signal: AbortSignal.timeout(10000)
    });
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
    console.error('Scrape Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
