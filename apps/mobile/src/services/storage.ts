import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'luna_device_token';
const SERVER_URL_KEY = 'luna_server_url';
const DEVICE_NAME_KEY = 'luna_device_name';

export class MobileStorage {
  private static memStorage: Record<string, string> = {
    [SERVER_URL_KEY]: 'http://192.168.31.113:8000', // Wi-Fi LAN IP for iPhone iOS / Android connection
    [DEVICE_NAME_KEY]: 'Mobile Device',
  };

  static async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      this.memStorage[key] = value;
    }
  }

  static async getItem(key: string): Promise<string | null> {
    try {
      const val = await SecureStore.getItemAsync(key);
      return val || this.memStorage[key] || null;
    } catch {
      return this.memStorage[key] || null;
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      delete this.memStorage[key];
    }
  }

  static async saveAuthToken(token: string) {
    return this.setItem(TOKEN_KEY, token);
  }

  static async getAuthToken(): Promise<string | null> {
    return this.getItem(TOKEN_KEY);
  }

  static async clearAuthToken() {
    return this.removeItem(TOKEN_KEY);
  }

  static async setServerUrl(url: string) {
    return this.setItem(SERVER_URL_KEY, url);
  }

  static async getServerUrl(): Promise<string> {
    const val = await this.getItem(SERVER_URL_KEY);
    return val || 'http://192.168.31.113:8000';
  }
}
