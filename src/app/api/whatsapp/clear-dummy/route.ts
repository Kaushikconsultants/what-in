import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    // Delete all messages first (foreign key constraints)
    await prisma.whatsAppMessage.deleteMany({});
    
    // Delete all payment links
    await prisma.whatsAppPaymentLink.deleteMany({});
    
    // Delete all form submissions
    await prisma.whatsAppFormSubmission.deleteMany({});
    
    // Finally delete all conversations
    await prisma.whatsAppConversation.deleteMany({});

    return NextResponse.json({ 
      success: true, 
      message: "Successfully deleted all dummy WhatsApp conversations and messages! The inbox is now ready for live chats." 
    });
  } catch (error: any) {
    console.error("Failed to clear dummy data:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
