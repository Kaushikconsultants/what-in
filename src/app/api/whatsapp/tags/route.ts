import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, isOwnerAuthenticated } from '@/lib/authSession';
import {
  getAllWhatsAppTagsWithCountsAction,
  getTagCustomersAction,
  createWhatsAppTagAction,
  updateWhatsAppTagAction,
  deleteWhatsAppTagAction
} from '@/app/actions/whatsAppPlatformActions';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    const isOwner = isOwnerAuthenticated(req);
    if (!authUser && !isOwner) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const withCounts = searchParams.get("withCounts") === "true";
    const forCustomers = searchParams.get("customers") === "true";
    const tagName = searchParams.get("tagName");

    if (forCustomers && tagName) {
      const search = searchParams.get("search") || "";
      const result = await getTagCustomersAction({ tagName, search });
      return NextResponse.json(result);
    }

    if (withCounts) {
      const result = await getAllWhatsAppTagsWithCountsAction();
      return NextResponse.json(result);
    }

    const rawTags = await prisma.whatsAppTag.findMany({
      orderBy: { name: 'asc' }
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
      return NextResponse.json({ success: false, error: "Only admins can manage tags." }, { status: 403 });
    }

    const body = await req.json();
    const result = await createWhatsAppTagAction({ name: body.name, color: body.color });
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
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

    const body = await req.json();

    // 1. Tag edit / rename flow
    if (body.id && (body.newName || body.color)) {
      if (!isOwner && (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "SUPER_ADMIN" && authUser.role !== "MANAGER"))) {
        return NextResponse.json({ success: false, error: "Only admins can edit tags." }, { status: 403 });
      }

      const res = await updateWhatsAppTagAction({
        id: body.id,
        oldName: body.oldName || body.name || "",
        newName: body.newName || body.name || "",
        color: body.color
      });
      if (!res.success) {
        return NextResponse.json(res, { status: 400 });
      }
      return NextResponse.json(res);
    }

    // 2. Conversation tag toggle flow
    const { conversationId, tagName, action } = body;

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

export async function DELETE(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    const isOwner = isOwnerAuthenticated(req);
    if (!isOwner && (!authUser || (authUser.role !== "ADMIN" && authUser.role !== "SUPER_ADMIN" && authUser.role !== "MANAGER"))) {
      return NextResponse.json({ success: false, error: "Only admins can delete tags." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { searchParams } = req.nextUrl;
    const id = body.id || searchParams.get("id");
    const name = body.name || searchParams.get("name");
    const untagCustomers = body.untagCustomers !== false;

    if (!id || !name) {
      return NextResponse.json({ success: false, error: "Tag id and name are required." }, { status: 400 });
    }

    const result = await deleteWhatsAppTagAction({ id, name, untagCustomers });
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
