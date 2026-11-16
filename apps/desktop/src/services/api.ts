/**
 * LUNA Desktop - API Client Service
 */

const BASE_URL = 'http://127.0.0.1:8000';

export class LunaAPI {
  static async getHealth() {
    const res = await fetch(`${BASE_URL}/health`);
    return res.json();
  }

  static async getSystemHealth() {
    const res = await fetch(`${BASE_URL}/api/system/health`);
    return res.json();
  }

  static async sendChatMessage(message: string, conversationId?: string, language = 'ta-IN', confirmationToken?: string) {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversationId, language, confirmationToken }),
    });
    return res.json();
  }

  static async listConversations() {
    const res = await fetch(`${BASE_URL}/api/conversations`);
    return res.json();
  }

  static async getMessages(conversationId: string) {
    const res = await fetch(`${BASE_URL}/api/conversations/${conversationId}/messages`);
    return res.json();
  }

  static async deleteConversation(conversationId: string) {
    const res = await fetch(`${BASE_URL}/api/conversations/${conversationId}`, {
      method: 'DELETE',
    });
    return res.json();
  }

  static async executeAction(actionId: string, parameters: Record<string, any> = {}, confirmationToken?: string) {
    const res = await fetch(`${BASE_URL}/api/actions/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId, parameters, confirmationToken }),
    });
    return res.json();
  }

  static async listActions() {
    const res = await fetch(`${BASE_URL}/api/actions`);
    return res.json();
  }

  static async listMemories(category?: string, query?: string) {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (query) params.append('q', query);
    const res = await fetch(`${BASE_URL}/api/memory?${params.toString()}`);
    return res.json();
  }

  static async createMemory(category: string, key: string, value: string, tags: string[] = []) {
    const res = await fetch(`${BASE_URL}/api/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, key, value, tags }),
    });
    return res.json();
  }

  static async deleteMemory(id: string) {
    const res = await fetch(`${BASE_URL}/api/memory/${id}`, { method: 'DELETE' });
    return res.json();
  }

  static async exportMemories() {
    const res = await fetch(`${BASE_URL}/api/memory/export`);
    return res.json();
  }

  static async listDevices() {
    const res = await fetch(`${BASE_URL}/api/devices`);
    return res.json();
  }

  static async createPairRequest() {
    const res = await fetch(`${BASE_URL}/api/devices/pair-request`, { method: 'POST' });
    return res.json();
  }

  static async revokeDevice(deviceId: string) {
    const res = await fetch(`${BASE_URL}/api/devices/${deviceId}`, { method: 'DELETE' });
    return res.json();
  }

  static async listAutomations() {
    const res = await fetch(`${BASE_URL}/api/automation`);
    return res.json();
  }

  static async createAutomation(data: any) {
    const res = await fetch(`${BASE_URL}/api/automation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }

  static async toggleAutomation(id: string) {
    const res = await fetch(`${BASE_URL}/api/automation/${id}/toggle`, { method: 'PATCH' });
    return res.json();
  }

  static async deleteAutomation(id: string) {
    const res = await fetch(`${BASE_URL}/api/automation/${id}`, { method: 'DELETE' });
    return res.json();
  }

  static async analyzeVision(imageBase64?: string, prompt?: string) {
    const res = await fetch(`${BASE_URL}/api/vision/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, prompt }),
    });
    return res.json();
  }

  static async getAuditLogs() {
    const res = await fetch(`${BASE_URL}/api/audit-logs`);
    return res.json();
  }

  static async getVoiceSettings() {
    const res = await fetch(`${BASE_URL}/api/settings/voice`);
    return res.json();
  }

  static async updateVoiceSettings(data: { elevenlabsApiKey?: string; elevenlabsVoiceId?: string; voiceSpeechProvider?: string }) {
    const res = await fetch(`${BASE_URL}/api/settings/voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }

  static getSpeakAudioUrl(text: string, language = 'ta-IN'): string {
    return `${BASE_URL}/api/voice/speak`;
  }
}
