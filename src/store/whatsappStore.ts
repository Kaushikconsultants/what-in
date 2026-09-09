import { create } from 'zustand';

interface WhatsAppState {
  // Inbox State
  conversations: any[];
  activeConvDetail: any | null;
  setConversations: (conversations: any[] | ((prev: any[]) => any[])) => void;
  setActiveConvDetail: (detail: any | ((prev: any) => any)) => void;
  
  // Logs State
  aiLogs: any[];
  aiLogStats: any;
  setAiLogs: (logs: any[]) => void;
  setAiLogStats: (stats: any) => void;
  
  webhookEvents: any[];
  webhookPayloads: any[];
  webhookStats: any;
  setWebhookEvents: (events: any[]) => void;
  setWebhookPayloads: (payloads: any[]) => void;
  setWebhookStats: (stats: any) => void;
}

export const useWhatsAppStore = create<WhatsAppState>((set) => ({
  conversations: [],
  activeConvDetail: null,
  setConversations: (update) => set((state) => ({ 
    conversations: typeof update === 'function' ? update(state.conversations) : update 
  })),
  setActiveConvDetail: (update) => set((state) => ({ 
    activeConvDetail: typeof update === 'function' ? update(state.activeConvDetail) : update 
  })),

  aiLogs: [],
  aiLogStats: { total: 0, success: 0, error: 0, manual: 0, avgDuration: 0 },
  setAiLogs: (logs) => set({ aiLogs: logs }),
  setAiLogStats: (stats) => set({ aiLogStats: stats }),

  webhookEvents: [],
  webhookPayloads: [],
  webhookStats: { totalReceived: 0, totalRead: 0, totalText: 0, totalMedia: 0 },
  setWebhookEvents: (events) => set({ webhookEvents: events }),
  setWebhookPayloads: (payloads) => set({ webhookPayloads: payloads }),
  setWebhookStats: (stats) => set({ webhookStats: stats }),
}));
