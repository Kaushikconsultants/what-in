import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const rawTags = await prisma.whatsAppTag.findMany({
      orderBy: { createdAt: 'desc' }
    });
    const tags = rawTags.filter(t => {
      const l = t.name.toLowerCase().trim();
      return l !== 'whatsapp lead' && l !== 'auto created';
    });
    return NextResponse.json({ success: true, tags });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, color, role } = await req.json();

    if (!name || name.trim() === '') {
      return NextResponse.json({ success: false, error: "Tag name is required." }, { status: 400 });
    }

    if (role === 'AGENT') {
      return NextResponse.json({ success: false, error: "Only admins can create new tags." }, { status: 403 });
    }

    // Check if tag already exists
    const existing = await prisma.whatsAppTag.findFirst({
      where: { name: { equals: name.trim(), mode: 'insensitive' } }
    });

    if (existing) {
      return NextResponse.json({ success: false, error: "Tag already exists." }, { status: 400 });
    }

    const newTag = await prisma.whatsAppTag.create({
      data: {
        name: name.trim(),
        color: color || '#e2e8f0'
      }
    });

    return NextResponse.json({ success: true, tag: newTag });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { conversationId, tagName, action } = await req.json();

    if (!conversationId || !tagName || !action) {
      return NextResponse.json({ success: false, error: "conversationId, tagName, and action ('add'|'remove') are required." }, { status: 400 });
    }

    const conversation = await prisma.whatsAppConversation.findUnique({
      where: { id: conversationId },
      include: { customer: true }
    });

    if (!conversation) {
      return NextResponse.json({ success: false, error: "Conversation not found." }, { status: 404 });
    }

    let currentTags = (conversation.tags || "").split(",").map(t => t.trim()).filter(Boolean);

    if (action === "add") {
      if (!currentTags.includes(tagName.trim())) {
        currentTags.push(tagName.trim());
      }
    } else if (action === "remove") {
      currentTags = currentTags.filter(t => t !== tagName.trim());
    }

    const updatedTagsStr = currentTags.join(", ");

    await prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: { tags: updatedTagsStr }
    });

    if (conversation.customerId) {
      // Keep customer tags in sync
      let custTags = (conversation.customer?.tags || "").split(",").map(t => t.trim()).filter(Boolean);
      if (action === "add" && !custTags.includes(tagName.trim())) custTags.push(tagName.trim());
      else if (action === "remove") custTags = custTags.filter(t => t !== tagName.trim());
      
      await prisma.customer.update({
        where: { id: conversation.customerId },
        data: { tags: custTags.join(", ") }
      });
    }

    return NextResponse.json({ success: true, tags: updatedTagsStr });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
