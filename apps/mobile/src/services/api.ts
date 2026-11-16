import { Platform } from 'react-native';
import { MobileStorage } from './storage';

export class MobileAPI {
  private static async getHeaders(): Promise<HeadersInit> {
    const token = await MobileStorage.getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  static async pairWithPC(pairingCode: string, deviceName?: string) {
    const baseUrl = await MobileStorage.getServerUrl();
    const defaultName = Platform.OS === 'ios' ? 'Apple iPhone' : 'Android Mobile';
    const res = await fetch(`${baseUrl}/api/devices/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pairingCode,
        deviceName: deviceName || defaultName,
        platform: Platform.OS,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to pair device.');
    }
    const data = await res.json();
    if (data.token) {
      await MobileStorage.saveAuthToken(data.token);
    }
    return data;
  }

  static async sendChatMessage(message: string, language = 'ta-IN', conversationId?: string) {
    const baseUrl = await MobileStorage.getServerUrl();
    const headers = await this.getHeaders();
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, language, conversationId }),
    });
    return res.json();
  }

  static async executePCAction(actionId: string, parameters: Record<string, any> = {}, confirmationToken?: string) {
    const baseUrl = await MobileStorage.getServerUrl();
    const headers = await this.getHeaders();
    const res = await fetch(`${baseUrl}/api/actions/execute`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ actionId, parameters, confirmationToken }),
    });
    return res.json();
  }

  static async getPCHalth() {
    const baseUrl = await MobileStorage.getServerUrl();
    const res = await fetch(`${baseUrl}/api/system/health`);
    return res.json();
  }

  static async listMemories() {
    const baseUrl = await MobileStorage.getServerUrl();
    const res = await fetch(`${baseUrl}/api/memory`);
    return res.json();
  }

  static async getTTSAudioUrl(text: string, language = 'ta-IN'): Promise<string> {
    const baseUrl = await MobileStorage.getServerUrl();
    return `${baseUrl}/api/voice/speak?text=${encodeURIComponent(text)}&language=${encodeURIComponent(language)}`;
  }

  static async transcribeAudio(audioUri: string, language = 'ta'): Promise<string> {
    const baseUrl = await MobileStorage.getServerUrl();
    const formData = new FormData();
    const filename = Platform.OS === 'ios' ? 'speech.m4a' : 'speech.webm';
    const mimeType = Platform.OS === 'ios' ? 'audio/m4a' : 'audio/webm';

    formData.append('file', {
      uri: audioUri,
      type: mimeType,
      name: filename,
    } as any);
    formData.append('language', language);

    const res = await fetch(`${baseUrl}/api/voice/transcribe`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data.text || '';
  }
}
