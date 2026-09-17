import { EventEmitter } from "events";

export interface InboxEvent {
  type: "NEW_MESSAGE" | "MESSAGE_STATUS" | "CONVERSATION_UPDATE" | "PAYMENT_OCR_DETECTED" | "CUSTOMER_LIVE_ACTIVITY";
  conversationId?: string;
  clientId?: string | null;
  messageId?: string;
  status?: string;
  paymentLinkId?: string | null;
  ocrData?: any;
  data?: any;
  timestamp?: number;
}

// Preserve singleton instance across Next.js hot reloads in development
const globalForInbox = globalThis as unknown as {
  inboxEventEmitter?: EventEmitter;
};

export const inboxEventEmitter =
  globalForInbox.inboxEventEmitter || new EventEmitter();

if (process.env.NODE_ENV !== "production") {
  globalForInbox.inboxEventEmitter = inboxEventEmitter;
}

// Maximum listeners to avoid Node memory leak warnings when many tabs connect
inboxEventEmitter.setMaxListeners(200);

export function emitInboxEvent(event: InboxEvent) {
  try {
    const payload: InboxEvent = {
      ...event,
      timestamp: event.timestamp || Date.now()
    };
    inboxEventEmitter.emit("inbox_event", payload);
  } catch (err) {
    console.error("[InboxEventBus] Error emitting event:", err);
  }
}

export function subscribeInboxEvents(listener: (event: InboxEvent) => void): () => void {
  inboxEventEmitter.on("inbox_event", listener);
  return () => {
    inboxEventEmitter.off("inbox_event", listener);
  };
}
