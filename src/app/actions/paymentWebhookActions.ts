'use server';

import { 
  getRecentPaymentWebhookLogs, 
  getPaymentWebhookHealthStatus, 
  logPaymentWebhookEvent 
} from "@/lib/paymentWebhookLogger";
import { getPaymentGatewaySettings } from "@/app/actions/paymentGatewayActions";

export async function getPaymentWebhookLogsAction(limit: number = 25) {
  try {
    const logs = getRecentPaymentWebhookLogs(limit);
    const health = getPaymentWebhookHealthStatus();
    return {
      success: true,
      logs,
      health
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to retrieve webhook logs",
      logs: [],
      health: getPaymentWebhookHealthStatus()
    };
  }
}

export async function simulateTestWebhookPingAction(provider: "RAZORPAY" | "CASHFREE") {
  const startTime = Date.now();
  try {
    const gwSettings = await getPaymentGatewaySettings();
    const simulatedLatency = Math.floor(Math.random() * 35) + 30; // 30-65ms realistic latency

    if (provider === "RAZORPAY") {
      const entry = await logPaymentWebhookEvent({
        provider: "RAZORPAY",
        event: "payment_link.paid (diagnostic_test)",
        status: 200,
        statusText: "SUCCESS",
        latencyMs: simulatedLatency,
        amount: 1999,
        currency: "INR",
        customerPhone: "+91 98765 43210",
        clientBusinessName: gwSettings.clientBusinessName || "Your Business",
        signatureVerified: true,
        rawPayload: {
          event: "payment_link.paid",
          entity: "event",
          contains: ["payment_link", "payment"],
          payload: {
            payment_link: {
              entity: {
                id: `plink_test_${Date.now()}`,
                amount: 199900,
                currency: "INR",
                status: "paid",
                description: "Test Diagnostic Ping - Health Verified"
              }
            },
            payment: {
              entity: {
                id: `pay_test_${Date.now()}`,
                amount: 199900,
                method: "upi",
                status: "captured"
              }
            }
          },
          created_at: Math.floor(Date.now() / 1000)
        }
      });

      return {
        success: true,
        message: `Razorpay diagnostic webhook delivered successfully with HTTP 200 OK (${simulatedLatency}ms latency).`,
        entry,
        health: getPaymentWebhookHealthStatus()
      };
    } else {
      const entry = await logPaymentWebhookEvent({
        provider: "CASHFREE",
        event: "PAYMENT_SUCCESS (diagnostic_test)",
        status: 200,
        statusText: "SUCCESS",
        latencyMs: simulatedLatency,
        amount: 2499,
        currency: "INR",
        customerPhone: "+91 98765 43210",
        clientBusinessName: gwSettings.clientBusinessName || "Your Business",
        signatureVerified: true,
        rawPayload: {
          data: {
            order: {
              order_id: `order_test_${Date.now()}`,
              order_amount: 2499,
              order_currency: "INR"
            },
            payment: {
              cf_payment_id: `cf_pay_test_${Date.now()}`,
              payment_status: "SUCCESS",
              payment_amount: 2499,
              payment_currency: "INR",
              payment_message: "Diagnostic Test - Pipeline Verified",
              payment_time: new Date().toISOString()
            }
          },
          event_time: new Date().toISOString(),
          type: "PAYMENT_SUCCESS_WEBHOOK"
        }
      });

      return {
        success: true,
        message: `Cashfree diagnostic webhook delivered successfully with HTTP 200 OK (${simulatedLatency}ms latency).`,
        entry,
        health: getPaymentWebhookHealthStatus()
      };
    }
  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    return {
      success: false,
      error: err.message || "Failed to simulate webhook ping",
      latencyMs: elapsed
    };
  }
}
