import { create } from 'zustand';
import { LunaAPI } from '../services/api';
import { speechEngine } from '../services/speech';

export type AssistantState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'thinking'
  | 'speaking'
  | 'executing'
  | 'error'
  | 'offline';

export type ActiveView =
  | 'home'
  | 'chat'
  | 'voice'
  | 'history'
  | 'memory'
  | 'pc-control'
  | 'devices'
  | 'automation'
  | 'vision'
  | 'system'
  | 'settings';

export interface PendingConfirmation {
  confirmationToken: string;
  actionId: string;
  actionName?: string;
  description?: string;
  permissionLevel: string;
  parameters: Record<string, any>;
  message?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  provider?: string;
  language?: string;
  toolCalls?: any[];
  toolResults?: any[];
}

interface LunaStore {
  activeView: ActiveView;
  assistantState: AssistantState;
  aiMode: string;
  activeProvider: string;
  language: 'ta-IN' | 'en-US';
  systemHealth: any;
  messages: ChatMessage[];
  currentConversationId: string | null;
  pendingConfirmation: PendingConfirmation | null;
  wakeWordEnabled: boolean;
  voiceAutoSpeak: boolean;
  isAudioPlaying: boolean;

  // Actions
  setActiveView: (view: ActiveView) => void;
  setAssistantState: (state: AssistantState) => void;
  setLanguage: (lang: 'ta-IN' | 'en-US') => void;
  setWakeWordEnabled: (enabled: boolean) => void;
  setVoiceAutoSpeak: (enabled: boolean) => void;
  setPendingConfirmation: (conf: PendingConfirmation | null) => void;
  fetchSystemHealth: () => Promise<void>;
  sendMessage: (text: string, gender?: 'male' | 'female') => Promise<void>;
  confirmPendingAction: () => Promise<void>;
  cancelPendingAction: () => void;
  loadConversationMessages: (convId: string) => Promise<void>;
  clearChat: () => void;
}

export const useLunaStore = create<LunaStore>((set, get) => ({
  activeView: 'home',
  assistantState: 'idle',
  aiMode: 'hybrid',
  activeProvider: 'hybrid',
  language: 'ta-IN',
  systemHealth: {
    cpuUsagePercent: 0,
    memoryUsagePercent: 0,
    diskUsagePercent: 0,
    batteryPercent: null,
    batteryPowerPlugged: null,
    hostname: 'PC',
    networkOnline: true,
  },
  messages: [
    {
      id: 'welcome-1',
      role: 'assistant',
      content: 'Vanakkam! Naan LUNA — unga personal intelligent assistant. Sollunga sir, enna command execute pannanum?',
      timestamp: new Date().toISOString(),
      provider: 'luna-core',
      language: 'ta-IN',
    },
  ],
  currentConversationId: null,
  pendingConfirmation: null,
  wakeWordEnabled: true,
  voiceAutoSpeak: true,
  isAudioPlaying: false,

  setActiveView: (view) => set({ activeView: view }),
  setAssistantState: (assistantState) => set({ assistantState }),
  setLanguage: (language) => {
    speechEngine.setLanguage(language);
    set({ language });
  },
  setWakeWordEnabled: (wakeWordEnabled) => set({ wakeWordEnabled }),
  setVoiceAutoSpeak: (voiceAutoSpeak) => set({ voiceAutoSpeak }),
  setPendingConfirmation: (pendingConfirmation) => set({ pendingConfirmation }),

  fetchSystemHealth: async () => {
    try {
      const data = await LunaAPI.getSystemHealth();
      set({
        systemHealth: data,
        aiMode: data.aiProviderStatus?.mode || 'hybrid',
        activeProvider: data.aiProviderStatus?.openai?.configured ? 'openai' : 'luna-local-engine',
      });
    } catch (e) {
      // offline fallback
      set((state) => ({
        systemHealth: { ...state.systemHealth, networkOnline: false },
        assistantState: state.assistantState === 'offline' ? 'offline' : state.assistantState,
      }));
    }
  },

  sendMessage: async (text: string, gender?: 'male' | 'female') => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      language: get().language,
    };

    set((state) => ({
      messages: [...state.messages, userMsg],
      assistantState: 'thinking',
    }));

    const recentHistory = get().messages.slice(-8).map(m => ({
      role: m.role,
      content: m.content
    }));

    try {
      const resp = await LunaAPI.sendChatMessage(
        text,
        get().currentConversationId || undefined,
        get().language,
        undefined,
        gender,
        true,
        recentHistory
      );

      // Execute Client-Side Actions (Calling, WhatsApp, YouTube, Timers)
      if (resp.toolResults && resp.toolResults.length > 0) {
        for (const tr of resp.toolResults) {
          const res = tr.result?.data || tr.result || {};

          // 1. Phone Call Trigger
          if ((tr.name === 'telephony_make_call' || res.action === 'call') && res.url) {
            if (typeof window !== 'undefined') {
              window.location.href = res.url;
            }
          }

          // 2. WhatsApp Trigger
          if ((tr.name === 'communication_send_whatsapp' || res.action === 'whatsapp') && res.url) {
            if (typeof window !== 'undefined') {
              window.open(res.url, '_blank');
            }
          }

          // 3. YouTube Music Trigger
          if (tr.name === 'media_play_youtube' && res.url) {
            if (typeof window !== 'undefined') {
              window.open(res.url, '_blank');
            }
          }

          // Check if any tool result triggered confirmation challenge
          if (res.confirmationRequired) {
            set({
              pendingConfirmation: {
                confirmationToken: res.confirmationToken,
                actionId: res.actionId,
                permissionLevel: res.permissionLevel || 'SENSITIVE',
                parameters: res.parameters || {},
                message: res.message || 'Explicit user confirmation required.',
              },
            });
            break;
          }
        }
      }

      const asstMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: resp.message,
        timestamp: new Date().toISOString(),
        provider: resp.provider,
        toolCalls: resp.toolCalls,
        toolResults: resp.toolResults,
      };

      set((state) => ({
        messages: [...state.messages, asstMsg],
        currentConversationId: resp.conversationId,
        assistantState: get().voiceAutoSpeak ? 'speaking' : 'idle',
      }));

      // Speak response aloud if auto speak enabled
      if (get().voiceAutoSpeak && resp.message) {
        set({ isAudioPlaying: true });
        await speechEngine.speak(resp.message, get().language);
        set({ isAudioPlaying: false, assistantState: 'idle' });
      }
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Kshamikanum, error aaiduchu: ${err.message || 'Core communication failure'}`,
        timestamp: new Date().toISOString(),
        provider: 'offline-error',
      };
      set((state) => ({
        messages: [...state.messages, errMsg],
        assistantState: 'error',
      }));
      setTimeout(() => set({ assistantState: 'idle' }), 3000);
    }
  },

  confirmPendingAction: async () => {
    const pending = get().pendingConfirmation;
    if (!pending) return;

    set({ assistantState: 'executing' });
    try {
      const res = await LunaAPI.executeAction(
        pending.actionId,
        pending.parameters,
        pending.confirmationToken
      );

      set({ pendingConfirmation: null });

      const msg = res.success
        ? `Action '${pending.actionId}' executed successfully.`
        : `Execution failed: ${res.error}`;

      const sysMsg: ChatMessage = {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: msg,
        timestamp: new Date().toISOString(),
        provider: 'action-executor',
      };

      set((state) => ({
        messages: [...state.messages, sysMsg],
        assistantState: 'idle',
      }));

      if (get().voiceAutoSpeak) {
        await speechEngine.speak(msg, get().language);
      }
    } catch (e: any) {
      set({ pendingConfirmation: null, assistantState: 'error' });
    }
  },

  cancelPendingAction: () => {
    set({ pendingConfirmation: null, assistantState: 'idle' });
  },

  loadConversationMessages: async (convId: string) => {
    try {
      const msgs = await LunaAPI.getMessages(convId);
      set({ messages: msgs, currentConversationId: convId });
    } catch (e) {
      console.error(e);
    }
  },

  clearChat: () => {
    set({
      messages: [
        {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: 'Chat refreshed. Sollunga boss, enna help venum?',
          timestamp: new Date().toISOString(),
          provider: 'luna-core',
        },
      ],
      currentConversationId: null,
    });
  },
}));
