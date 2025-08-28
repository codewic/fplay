export interface BotContent {
  id: string;
  type: ContentType;
  title: string;
  content: string;
  variables?: Record<string, string>;
  metadata?: ContentMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export enum ContentType {
  WELCOME = 'welcome',
  GUIDE = 'guide',
  MENU = 'menu',
  HELP = 'help',
  LIST = 'list',
  CUSTOM = 'custom'
}

export interface ContentMetadata {
  version?: string;
  plugins?: number;
  ePlugins?: number;
  sudo?: number;
  features?: Record<string, boolean>;
  links?: Record<string, string>;
  platform?: string;
  uptime?: string;
  ram?: string;
}

export interface ContentTemplate {
  type: ContentType;
  template: string;
  requiredVariables: string[];
  optionalVariables?: string[];
}

export interface UserContext {
  name?: string;
  phoneNumber?: string;
  isAdmin?: boolean;
  joinDate?: Date;
  messageCount?: number;
}

export interface BotStats {
  version: string;
  plugins: number;
  ePlugins: number;
  sudo: number;
  uptime: string;
  ram: string;
  platform: string;
  features: Record<string, boolean>;
}

export interface ContentDeliveryOptions {
  userContext?: UserContext;
  botStats?: BotStats;
  customVariables?: Record<string, string>;
  includeTimestamp?: boolean;
  includeUserInfo?: boolean;
}
