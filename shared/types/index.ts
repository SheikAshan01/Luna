/**
 * LUNA AI - Shared Types & Contracts
 * Shared across Desktop (Electron/React), Mobile (Expo), and Backend APIs.
 */

export type AIProvider = 'openai' | 'ollama' | 'hybrid' | 'mock';

export type AssistantState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'thinking'
  | 'speaking'
  | 'executing'
  | 'error'
  | 'offline';

export type SupportedLanguage = 'en' | 'ta' | 'tanglish';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  provider?: string;
  language?: SupportedLanguage;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  error?: boolean;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result: any;
  error?: string;
}

export type PermissionLevel = 'READ_ONLY' | 'LOW_RISK' | 'SENSITIVE' | 'DESTRUCTIVE';

export interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  permissionLevel: PermissionLevel;
  confirmationRequired: boolean;
  parametersSchema: Record<string, any>;
}

export interface ActionExecutionRequest {
  actionId: string;
  parameters: Record<string, any>;
  confirmationToken?: string;
  deviceId?: string;
}

export interface ActionExecutionResult {
  success: boolean;
  actionId: string;
  data?: any;
  error?: string;
  auditId?: string;
  timestamp: string;
  confirmationRequired?: boolean;
  confirmationToken?: string;
  permissionLevel?: PermissionLevel;
  message?: string;
}

export interface ConfirmationRequestPayload {
  confirmationToken: string;
  actionId: string;
  actionName: string;
  description: string;
  permissionLevel: PermissionLevel;
  parameters: Record<string, any>;
  expiresAt: string;
}

export interface DeviceInfo {
  id: string;
  name: string;
  platform: 'windows' | 'android' | 'web';
  isPaired: boolean;
  isOnline: boolean;
  lastSeen: string;
  ipAddress?: string;
  permissions?: string[];
}

export interface DevicePairingRequest {
  pairingCode: string;
  deviceName: string;
  platform: 'android' | 'windows' | 'web';
}

export interface DevicePairingResponse {
  deviceId: string;
  token: string;
  deviceName: string;
  pairedAt: string;
}

export type MemoryCategory =
  | 'user_preference'
  | 'communication_preference'
  | 'frequently_used_command'
  | 'project_context'
  | 'personal_note'
  | 'conversation_summary';

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  key: string;
  value: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SystemHealth {
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  memoryTotalBytes: number;
  memoryUsedBytes: number;
  diskUsagePercent: number;
  batteryPercent?: number | null;
  batteryPowerPlugged?: boolean | null;
  osName: string;
  hostname: string;
  activeProvider: string;
  networkOnline: boolean;
  timestamp: string;
}

export interface VoiceSettings {
  language: SupportedLanguage;
  speechProvider: 'edge-tts' | 'gtts' | 'web-speech' | 'piper';
  tamilVoice: string;
  englishVoice: string;
  speed: number;
  pitch: number;
  wakeWordEnabled: boolean;
  wakeWordSensitivity: number;
  pushToTalkEnabled: boolean;
}

export interface AutomationTask {
  id: string;
  name: string;
  description?: string;
  scheduleType: 'cron' | 'interval' | 'once';
  scheduleExpression: string; // e.g. "0 9 * * *" or "60" or ISO timestamp
  actionId: string;
  actionParameters: Record<string, any>;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  createdAt: string;
}

export interface VisionAnalysisResult {
  summary: string;
  detectedText?: string;
  errorExplanation?: string;
  suggestedAction?: string;
  tamilExplanation?: string;
  timestamp: string;
}
