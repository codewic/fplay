import { BasePlugin } from '../../basePlugin';
import { PluginMetadata, PluginContext, PluginResponse, PluginCategory } from '../../types';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

export default class StickerPlugin extends BasePlugin {
  metadata: PluginMetadata = {
    name: 'Sticker',
    description: 'Convert an image or video to a sticker',
    commands: ['sticker', 's', 'stiker'],
    category: PluginCategory.STICKER,
    version: '1.0.0',
    author: 'Bot Team',
    enabled: true,
    cooldown: 5
  };

  async execute(context: PluginContext): Promise<PluginResponse> {
    try {
      const quotedMessage = context.message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage) {
        await this.sendMessage(context, '❌ Please reply to an image or video to convert it to a sticker.');
        return this.createResponse(false, 'No quoted message found');
      }

      const imageMessage = quotedMessage.imageMessage;
      const videoMessage = quotedMessage.videoMessage;

      if (!imageMessage && !videoMessage) {
        await this.sendMessage(context, '❌ Please reply to an image or video file.');
        return this.createResponse(false, 'Invalid media type');
      }

      await this.react(context, '⏳');

      try {
        // Download the media
        const mediaBuffer = await downloadMediaMessage(
          { message: quotedMessage } as any,
          'buffer',
          {}
        );

        if (!mediaBuffer) {
          throw new Error('Failed to download media');
        }

        // For now, we'll send the buffer as a sticker
        // In a real implementation, you'd want to process the image/video
        // to ensure it meets sticker requirements (512x512, WebP format, etc.)
        await this.sendSticker(context, mediaBuffer as Buffer);
        await this.react(context, '✅');

        return this.createResponse(true, 'Sticker created successfully');
      } catch (downloadError) {
        await this.react(context, '❌');
        await this.sendMessage(context, '❌ Failed to process the media. Please try again.');
        return this.createResponse(false, `Failed to process media: ${downloadError}`);
      }
    } catch (error) {
      return this.createResponse(false, undefined, undefined, `Failed to execute sticker: ${error}`);
    }
  }
}
