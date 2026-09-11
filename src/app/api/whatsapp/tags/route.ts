import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, isOwnerAuthenticated } from '@/lib/authSession';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    const isOwner = isOwnerAuthenticated(req);
    if (!authUser && !isOwner) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

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

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    const isOwner = isOwnerAuthenticated(req);
    if (!isOwner && (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "SUPER_ADMIN" && authUser.role !== "MANAGER"))) {
      return NextResponse.json({ success: false, error: "Only admins can create new tags." }, { status: 403 });
    }

    const { name, color } = await req.json();

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

export async function PUT(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    const isOwner = isOwnerAuthenticated(req);
    if (!authUser && !isOwner) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

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
