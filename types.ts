export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Attachment {
  mimeType: string;
  url: string; // For display
  data: string; // Base64 for API
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  attachments?: Attachment[];
  isStreaming?: boolean;
  timestamp: number;
  groundingMetadata?: any;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export enum ModelId {
  FLASH = 'gemini-2.5-flash',
  PRO = 'gemini-3-pro-preview',
  FLASH_LITE = 'gemini-flash-lite-latest'
}

export interface UserProfile {
  firstName: string;
  email: string;
}

export interface AppState {
  user: UserProfile | null;
  currentSessionId: string | null;
  sessions: Record<string, ChatSession>;
  selectedModel: ModelId;
  sidebarOpen: boolean;
}