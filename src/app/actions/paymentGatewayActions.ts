'use server';

import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, isOwnerAuthenticated } from '@/lib/authSession';

export async function getPaymentGatewaySettings() {
  const user = await getAuthenticatedUser();
  const isOwner = await isOwnerAuthenticated();

  if (!isOwner && !user) {
    return {
      activeGateway: null,
      razorpayKeyId: '',
      razorpayKeySecret: '',
      cashfreeAppId: '',
      cashfreeSecretKey: '',
      merchantUpiId: '',
      merchantUpiName: '',
      error: "Unauthorized"
    };
  }

  const isPrivileged = Boolean(
    isOwner || 
    (user && (user.role === 'ADMIN' || user.role === 'OWNER' || user.role === 'SUPER_ADMIN'))
  );

  if (user?.clientId) {
    const client = await prisma.whatsAppClient.findUnique({
      where: { id: user.clientId }
    });
    return {
      activeGateway: client?.activeGateway || null,
      razorpayKeyId: client?.razorpayKeyId || '',
      razorpayKeySecret: isPrivileged ? (client?.razorpayKeySecret || '') : '',
      cashfreeAppId: client?.cashfreeAppId || '',
      cashfreeSecretKey: isPrivileged ? (client?.cashfreeSecretKey || '') : '',
      merchantUpiId: client?.merchantUpiId || '',
      merchantUpiName: client?.merchantUpiName || '',
    };
  }

  const settings = await prisma.whatsAppSettings.findFirst();
  return {
    activeGateway: settings?.activeGateway || null,
    razorpayKeyId: settings?.razorpayKeyId || '',
    razorpayKeySecret: isPrivileged ? (settings?.razorpayKeySecret || '') : '',
    cashfreeAppId: settings?.cashfreeAppId || '',
    cashfreeSecretKey: isPrivileged ? (settings?.cashfreeSecretKey || '') : '',
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
  const user = await getAuthenticatedUser();
  const isOwner = await isOwnerAuthenticated();

  if (!isOwner && (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN'))) {
    return { success: false, error: "Unauthorized: Admin privileges required to update payment gateways" };
  }

  if (user?.clientId) {
    await prisma.whatsAppClient.update({
      where: { id: user.clientId },
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

/** Helper used by flow engine internally to get active gateway creds */
export async function getActiveGateway(clientId?: string) {
  if (clientId) {
    const client = await prisma.whatsAppClient.findUnique({ where: { id: clientId } });
    if (client?.activeGateway && client.activeGateway !== 'NONE') {
      return {
        gateway: client.activeGateway,
        razorpayKeyId: client.razorpayKeyId,
        razorpayKeySecret: client.razorpayKeySecret,
        cashfreeAppId: client.cashfreeAppId,
        cashfreeSecretKey: client.cashfreeSecretKey,
        merchantUpiId: client.merchantUpiId,
        merchantUpiName: client.merchantUpiName,
      };
    }
  }

  const user = await getAuthenticatedUser();
  if (user?.clientId) {
    const client = await prisma.whatsAppClient.findUnique({ where: { id: user.clientId } });
    if (client?.activeGateway && client.activeGateway !== 'NONE') {
      return {
        gateway: client.activeGateway,
        razorpayKeyId: client.razorpayKeyId,
        razorpayKeySecret: client.razorpayKeySecret,
        cashfreeAppId: client.cashfreeAppId,
        cashfreeSecretKey: client.cashfreeSecretKey,
        merchantUpiId: client.merchantUpiId,
        merchantUpiName: client.merchantUpiName,
      };
    }
  }

  const settings = await prisma.whatsAppSettings.findFirst();
  if (!settings?.activeGateway || settings.activeGateway === 'NONE') return null;
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
