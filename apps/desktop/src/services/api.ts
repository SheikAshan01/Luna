/**
 * LUNA Desktop - API Client Service
 */

export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('luna_api_url');
    if (saved && saved.trim()) return saved.trim().replace(/\/+$/, '');
  }
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim().replace(/\/+$/, '');
  return 'http://127.0.0.1:8000';
};

export const setApiBaseUrl = (url: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('luna_api_url', url.trim().replace(/\/+$/, ''));
  }
};

export class LunaAPI {
  static get baseUrl() {
    return getApiBaseUrl();
  }

  static async getHealth() {
    const res = await fetch(`${getApiBaseUrl()}/health`);
    return res.json();
  }

  static async getSystemHealth() {
    const res = await fetch(`${getApiBaseUrl()}/api/system/health`);
    return res.json();
  }

  static async sendChatMessage(message: string, conversationId?: string, language = 'ta-IN', confirmationToken?: string) {
    const res = await fetch(`${getApiBaseUrl()}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversationId, language, confirmationToken }),
    });
    return res.json();
  }

  static async listConversations() {
    const res = await fetch(`${getApiBaseUrl()}/api/conversations`);
    return res.json();
  }

  static async getMessages(conversationId: string) {
    const res = await fetch(`${getApiBaseUrl()}/api/conversations/${conversationId}/messages`);
    return res.json();
  }

  static async deleteConversation(conversationId: string) {
    const res = await fetch(`${getApiBaseUrl()}/api/conversations/${conversationId}`, {
      method: 'DELETE',
    });
    return res.json();
  }

  static async executeAction(actionId: string, parameters: Record<string, any> = {}, confirmationToken?: string) {
    const res = await fetch(`${getApiBaseUrl()}/api/actions/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId, parameters, confirmationToken }),
    });
    return res.json();
  }

  static async listActions() {
    const res = await fetch(`${getApiBaseUrl()}/api/actions`);
    return res.json();
  }

  static async listMemories(category?: string, query?: string) {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (query) params.append('q', query);
    const res = await fetch(`${getApiBaseUrl()}/api/memory?${params.toString()}`);
    return res.json();
  }

  static async createMemory(category: string, key: string, value: string, tags: string[] = []) {
    const res = await fetch(`${getApiBaseUrl()}/api/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, key, value, tags }),
    });
    return res.json();
  }

  static async deleteMemory(id: string) {
    const res = await fetch(`${getApiBaseUrl()}/api/memory/${id}`, { method: 'DELETE' });
    return res.json();
  }

  static async exportMemories() {
    const res = await fetch(`${getApiBaseUrl()}/api/memory/export`);
    return res.json();
  }

  static async listDevices() {
    const res = await fetch(`${getApiBaseUrl()}/api/devices`);
    return res.json();
  }

  static async createPairRequest() {
    const res = await fetch(`${getApiBaseUrl()}/api/devices/pair-request`, { method: 'POST' });
    return res.json();
  }

  static async revokeDevice(deviceId: string) {
    const res = await fetch(`${getApiBaseUrl()}/api/devices/${deviceId}`, { method: 'DELETE' });
    return res.json();
  }

  static async listAutomations() {
    const res = await fetch(`${getApiBaseUrl()}/api/automation`);
    return res.json();
  }

  static async createAutomation(data: any) {
    const res = await fetch(`${getApiBaseUrl()}/api/automation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }

  static async toggleAutomation(id: string) {
    const res = await fetch(`${getApiBaseUrl()}/api/automation/${id}/toggle`, { method: 'PATCH' });
    return res.json();
  }

  static async deleteAutomation(id: string) {
    const res = await fetch(`${getApiBaseUrl()}/api/automation/${id}`, { method: 'DELETE' });
    return res.json();
  }

  static async analyzeVision(imageBase64?: string, prompt?: string) {
    const res = await fetch(`${getApiBaseUrl()}/api/vision/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, prompt }),
    });
    return res.json();
  }

  static async getAuditLogs() {
    const res = await fetch(`${getApiBaseUrl()}/api/audit-logs`);
    return res.json();
  }

  static async getVoiceSettings() {
    const res = await fetch(`${getApiBaseUrl()}/api/settings/voice`);
    return res.json();
  }

  static async updateVoiceSettings(data: { elevenlabsApiKey?: string; elevenlabsVoiceId?: string; voiceSpeechProvider?: string }) {
    const res = await fetch(`${getApiBaseUrl()}/api/settings/voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }

  static getSpeakAudioUrl(text: string, language = 'ta-IN'): string {
    return `${getApiBaseUrl()}/api/voice/speak`;
  }
}
