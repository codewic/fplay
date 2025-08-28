import { IPlugin, PluginMetadata, PluginContext, PluginResponse, PluginCategory } from './types';
import { logger } from '../utils/logger';

export abstract class BasePlugin implements IPlugin {
  public abstract metadata: PluginMetadata;

  constructor() {
    // Initialize plugin
  }

  abstract execute(context: PluginContext): Promise<PluginResponse>;

  async onLoad(): Promise<void> {
    logger.info(`Plugin ${this.metadata.name} loaded successfully`);
  }

  async onUnload(): Promise<void> {
    logger.info(`Plugin ${this.metadata.name} unloaded`);
  }

  async validatePermissions(context: PluginContext): Promise<boolean> {
    // Check if plugin is admin only
    if (this.metadata.adminOnly && !context.isAdmin) {
      return false;
    }

    // Check if plugin is group only
    if (this.metadata.groupOnly && !context.isGroup) {
      return false;
    }

    return true;
  }

  protected createResponse(success: boolean, message?: string, data?: any, error?: string): PluginResponse {
    return {
      success,
      message,
      data,
      error
    };
  }

  protected async sendMessage(context: PluginContext, text: string): Promise<void> {
    try {
      await context.sock.sendMessage(context.chatId, { text });
    } catch (error) {
      logger.error(`Error sending message in plugin ${this.metadata.name}:`, error);
      throw error;
    }
  }

  protected async sendImage(context: PluginContext, imageBuffer: Buffer, caption?: string): Promise<void> {
    try {
      await context.sock.sendMessage(context.chatId, {
        image: imageBuffer,
        caption
      });
    } catch (error) {
      logger.error(`Error sending image in plugin ${this.metadata.name}:`, error);
      throw error;
    }
  }

  protected async sendVideo(context: PluginContext, videoBuffer: Buffer, caption?: string): Promise<void> {
    try {
      await context.sock.sendMessage(context.chatId, {
        video: videoBuffer,
        caption
      });
    } catch (error) {
      logger.error(`Error sending video in plugin ${this.metadata.name}:`, error);
      throw error;
    }
  }

  protected async sendAudio(context: PluginContext, audioBuffer: Buffer): Promise<void> {
    try {
      await context.sock.sendMessage(context.chatId, {
        audio: audioBuffer,
        mimetype: 'audio/mp4'
      });
    } catch (error) {
      logger.error(`Error sending audio in plugin ${this.metadata.name}:`, error);
      throw error;
    }
  }

  protected async sendSticker(context: PluginContext, stickerBuffer: Buffer): Promise<void> {
    try {
      await context.sock.sendMessage(context.chatId, {
        sticker: stickerBuffer
      });
    } catch (error) {
      logger.error(`Error sending sticker in plugin ${this.metadata.name}:`, error);
      throw error;
    }
  }

  protected async sendDocument(context: PluginContext, documentBuffer: Buffer, filename: string, mimetype?: string): Promise<void> {
    try {
      await context.sock.sendMessage(context.chatId, {
        document: documentBuffer,
        fileName: filename,
        mimetype
      });
    } catch (error) {
      logger.error(`Error sending document in plugin ${this.metadata.name}:`, error);
      throw error;
    }
  }

  protected async react(context: PluginContext, emoji: string): Promise<void> {
    try {
      await context.sock.sendMessage(context.chatId, {
        react: {
          text: emoji,
          key: context.message.key
        }
      });
    } catch (error) {
      logger.error(`Error reacting in plugin ${this.metadata.name}:`, error);
      throw error;
    }
  }

  protected extractMentions(messageText: string): string[] {
    const mentionRegex = /@(\d+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(messageText)) !== null) {
      mentions.push(match[1] + '@s.whatsapp.net');
    }

    return mentions;
  }

  protected isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  protected formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  protected formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}
