'use server';

import { prisma } from '@/lib/prisma';

export async function getPaymentGatewaySettings() {
  const settings = await prisma.whatsAppSettings.findFirst();
  return {
    activeGateway: settings?.activeGateway || null,
    razorpayKeyId: settings?.razorpayKeyId || '',
    razorpayKeySecret: settings?.razorpayKeySecret || '',
    cashfreeAppId: settings?.cashfreeAppId || '',
    cashfreeSecretKey: settings?.cashfreeSecretKey || '',
    merchantUpiId: settings?.merchantUpiId || '',
    merchantUpiName: settings?.merchantUpiName || '',
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

/** Helper used by flow engine to get active gateway creds */
export async function getActiveGateway() {
  const settings = await prisma.whatsAppSettings.findFirst();
  if (!settings?.activeGateway) return null;
  return {
    gateway: settings.activeGateway,
    razorpayKeyId: settings.razorpayKeyId,
    razorpayKeySecret: settings.razorpayKeySecret,
    cashfreeAppId: settings.cashfreeAppId,
    cashfreeSecretKey: settings.cashfreeSecretKey,
    merchantUpiId: settings.merchantUpiId,
    merchantUpiName: settings.merchantUpiName,
  };
}
