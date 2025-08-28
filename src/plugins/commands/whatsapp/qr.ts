import { BasePlugin } from '../../basePlugin';
import { PluginMetadata, PluginContext, PluginResponse, PluginCategory } from '../../types';
import QRCode from 'qrcode';

export default class QRPlugin extends BasePlugin {
  metadata: PluginMetadata = {
    name: 'QR Code',
    description: 'Generate a QR code from text or decode a QR code from an image',
    commands: ['qr', 'qrcode'],
    category: PluginCategory.WHATSAPP,
    version: '1.0.0',
    author: 'Bot Team',
    enabled: true,
    cooldown: 10
  };

  async execute(context: PluginContext): Promise<PluginResponse> {
    try {
      const text = context.args.slice(1).join(' ');
      
      if (!text) {
        await this.sendMessage(context, '📱 *QR Code Generator*\n\nUsage: `.qr <text to encode>`\n\nExample: `.qr Hello World!`\nExample: `.qr https://example.com`');
        return this.createResponse(true, 'QR usage shown');
      }

      await this.react(context, '⏳');

      try {
        // Generate QR code
        const qrCodeDataURL = await QRCode.toDataURL(text, {
          errorCorrectionLevel: 'M',
          type: 'image/png',
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          width: 512
        });

        // Convert data URL to buffer
        const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
        const qrBuffer = Buffer.from(base64Data, 'base64');

        await this.sendImage(context, qrBuffer, `📱 *QR Code Generated*\n\nText: ${text}`);
        await this.react(context, '✅');

        return this.createResponse(true, 'QR code generated successfully');
      } catch (qrError) {
        await this.sendMessage(context, '❌ Failed to generate QR code. Please try with shorter text.');
        await this.react(context, '❌');
        return this.createResponse(false, `QR generation failed: ${qrError}`);
      }
    } catch (error) {
      await this.react(context, '❌');
      return this.createResponse(false, undefined, undefined, `Failed to execute QR: ${error}`);
    }
  }
}
