"use server";

import { prisma } from "@/lib/prisma";
import { isOwnerAuthenticated } from "@/lib/authSession";

export interface LeadSubmissionPayload {
  name: string;
  businessName: string;
  mobile: string;
  email: string;
  platform?: "WHATMORE" | "WHATIN";
  selectedPlan?: string;
  message?: string;
}

/**
 * Public action: Visitor submits lead/contact form from the 3D landing page
 */
export async function submitPlatformLeadAction(payload: LeadSubmissionPayload) {
  try {
    const { name, businessName, mobile, email, platform, selectedPlan, message } = payload;

    if (!name || !name.trim()) {
      return { success: false, error: "Please enter your full name." };
    }
    if (!businessName || !businessName.trim()) {
      return { success: false, error: "Please enter your company or business name." };
    }
    if (!mobile || !mobile.trim()) {
      return { success: false, error: "Please enter your WhatsApp / mobile number." };
    }
    if (!email || !email.trim() || !email.includes("@")) {
      return { success: false, error: "Please provide a valid work email address." };
    }

    const cleanMobile = mobile.replace(/[^0-9+]/g, "").trim();

    const lead = await prisma.whatsAppPlatformLead.create({
      data: {
        name: name.trim(),
        businessName: businessName.trim(),
        mobile: cleanMobile,
        email: email.trim().toLowerCase(),
        platform: platform || "WHATMORE",
        selectedPlan: selectedPlan || "GROWTH",
        message: message ? message.trim() : null,
        status: "NEW",
      }
    });

    return {
      success: true,
      leadId: lead.id,
      name: lead.name,
      businessName: lead.businessName
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to submit inquiry. Please try again." };
  }
}

/**
 * Super-Admin action: Fetch all captured leads with metrics
 */
export async function getPlatformLeadsAction(params?: {
  status?: string;
  platform?: string;
  search?: string;
}) {
  try {
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required", leads: [] };
    }

    const where: any = {};
    if (params?.status && params.status !== "ALL") {
      where.status = params.status;
    }
    if (params?.platform && params.platform !== "ALL") {
      where.platform = params.platform;
    }
    if (params?.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { businessName: { contains: q, mode: "insensitive" } },
        { mobile: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }

    const leads = await prisma.whatsAppPlatformLead.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });

    const allLeads = await prisma.whatsAppPlatformLead.findMany({
      select: { status: true, platform: true }
    });

    const total = allLeads.length;
    const newCount = allLeads.filter(l => l.status === "NEW").length;
    const contactedCount = allLeads.filter(l => l.status === "CONTACTED").length;
    const convertedCount = allLeads.filter(l => l.status === "CONVERTED").length;
    const lostCount = allLeads.filter(l => l.status === "LOST").length;

    return {
      success: true,
      leads,
      counts: {
        total,
        newCount,
        contactedCount,
        convertedCount,
        lostCount
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to load leads", leads: [] };
  }
}

/**
 * Super-Admin action: Update lead disposition status & notes
 */
export async function updatePlatformLeadStatusAction(id: string, status: string, notes?: string) {
  try {
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }

    const updateData: any = { status };
    if (notes !== undefined) updateData.notes = notes;

    const lead = await prisma.whatsAppPlatformLead.update({
      where: { id },
      data: updateData
    });

    return { success: true, lead };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Super-Admin action: Delete lead
 */
export async function deletePlatformLeadAction(id: string) {
  try {
    if (!(await isOwnerAuthenticated())) {
      return { success: false, error: "Unauthorized access: Owner login required" };
    }

    await prisma.whatsAppPlatformLead.delete({
      where: { id }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
