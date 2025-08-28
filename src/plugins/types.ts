import { WASocket, proto } from "@whiskeysockets/baileys";

export interface PluginContext {
  sock: WASocket;
  message: proto.IWebMessageInfo;
  sessionId: string;
  userId: string;
  chatId: string;
  messageText: string;
  args: string[];
  isGroup: boolean;
  isAdmin?: boolean;
  sender: string;
}

export interface PluginResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export interface PluginMetadata {
  name: string;
  description: string;
  commands: string[];
  category: PluginCategory;
  version: string;
  author?: string;
  enabled: boolean;
  adminOnly?: boolean;
  groupOnly?: boolean;
  cooldown?: number; // in seconds
  permissions?: string[];
}

export enum PluginCategory {
  AI = 'ai',
  AUDIO = 'audio',
  DOWNLOAD = 'download',
  EDITOR = 'editor',
  GAME = 'game',
  GROUP = 'group',
  MISC = 'misc',
  SEARCH = 'search',
  STICKER = 'sticker',
  TEXTMAKER = 'textmaker',
  USER = 'user',
  VIDEO = 'video',
  WHATSAPP = 'whatsapp'
}

export interface IPlugin {
  metadata: PluginMetadata;
  execute(context: PluginContext): Promise<PluginResponse>;
  onLoad?(): Promise<void>;
  onUnload?(): Promise<void>;
  validatePermissions?(context: PluginContext): Promise<boolean>;
}

export interface PluginConfig {
  enabled: boolean;
  adminOnly: boolean;
  groupOnly: boolean;
  cooldown: number;
  customSettings?: Record<string, any>;
}

export interface CommandCooldown {
  userId: string;
  command: string;
  lastUsed: Date;
}

export interface PluginLoadResult {
  success: boolean;
  plugin?: IPlugin;
  error?: string;
}
