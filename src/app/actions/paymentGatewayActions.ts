'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

async function getSessionClient() {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('wm_user')?.value;
    if (userCookie) {
      const parsed = JSON.parse(decodeURIComponent(userCookie));
      if (parsed?.clientId) {
        const client = await prisma.whatsAppClient.findUnique({ where: { id: parsed.clientId } });
        if (client) return client;
      }
      if (parsed?.email) {
        const agent = await prisma.whatsAppAgentUser.findUnique({ where: { email: parsed.email } });
        if (agent?.clientId) {
          const client = await prisma.whatsAppClient.findUnique({ where: { id: agent.clientId } });
          if (client) return client;
        }
        const clientByEmail = await prisma.whatsAppClient.findFirst({
          where: { OR: [{ contactEmail: parsed.email }, { adminEmail: parsed.email }, { contactPhone: parsed.phone || parsed.email }] }
        });
        if (clientByEmail) return clientByEmail;
      }
    }
  } catch {}
  return null;
}

export async function getPaymentGatewaySettings() {
  const client = await getSessionClient();
  if (client) {
    return {
      activeGateway: client.activeGateway || null,
      razorpayKeyId: client.razorpayKeyId || '',
      razorpayKeySecret: client.razorpayKeySecret || '',
      cashfreeAppId: client.cashfreeAppId || '',
      cashfreeSecretKey: client.cashfreeSecretKey || '',
      merchantUpiId: client.merchantUpiId || '',
      merchantUpiName: client.merchantUpiName || client.businessName || '',
    };
  }

  const globalSettings = await prisma.whatsAppSettings.findFirst().catch(() => null);
  return {
    activeGateway: globalSettings?.activeGateway || null,
    razorpayKeyId: globalSettings?.razorpayKeyId || '',
    razorpayKeySecret: globalSettings?.razorpayKeySecret || '',
    cashfreeAppId: globalSettings?.cashfreeAppId || '',
    cashfreeSecretKey: globalSettings?.cashfreeSecretKey || '',
    merchantUpiId: globalSettings?.merchantUpiId || '',
    merchantUpiName: globalSettings?.merchantUpiName || '',
  };
}

export async function savePaymentGatewaySettings(data: {
  activeGateway: string | null;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  cashfreeAppId?: string;
  cashfreeSecretKey?: string;
  merchantUpiId?: string;
  merchantUpiName?: string;
}) {
  const client = await getSessionClient();
  if (client) {
    await prisma.whatsAppClient.update({
      where: { id: client.id },
      data: {
        activeGateway: data.activeGateway,
        razorpayKeyId: data.razorpayKeyId,
        razorpayKeySecret: data.razorpayKeySecret,
        cashfreeAppId: data.cashfreeAppId,
        cashfreeSecretKey: data.cashfreeSecretKey,
        merchantUpiId: data.merchantUpiId,
        merchantUpiName: data.merchantUpiName,
      },
    });
    return { success: true };
  }

  // Only update global settings if super-admin/no client session
  const existing = await prisma.whatsAppSettings.findFirst();
  if (existing) {
    await prisma.whatsAppSettings.update({
      where: { id: existing.id },
      data: {
        activeGateway: data.activeGateway,
        razorpayKeyId: data.razorpayKeyId,
        razorpayKeySecret: data.razorpayKeySecret,
        cashfreeAppId: data.cashfreeAppId,
        cashfreeSecretKey: data.cashfreeSecretKey,
        merchantUpiId: data.merchantUpiId,
        merchantUpiName: data.merchantUpiName,
      },
    });
  } else {
    await prisma.whatsAppSettings.create({
      data: {
        activeGateway: data.activeGateway,
        razorpayKeyId: data.razorpayKeyId,
        razorpayKeySecret: data.razorpayKeySecret,
        cashfreeAppId: data.cashfreeAppId,
        cashfreeSecretKey: data.cashfreeSecretKey,
        merchantUpiId: data.merchantUpiId,
        merchantUpiName: data.merchantUpiName,
      },
    });
  }
  return { success: true };
}
