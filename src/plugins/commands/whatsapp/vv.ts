import { BasePlugin } from "../../basePlugin";
import {
  PluginMetadata,
  PluginContext,
  PluginResponse,
  PluginCategory,
} from "../../types";

export default class ViewOncePlugin extends BasePlugin {
  metadata: PluginMetadata = {
    name: "View Once Extractor",
    description: "Extract and reveal view once content by replying with .vv",
    commands: ["vv", "viewonce"],
    category: PluginCategory.WHATSAPP,
    version: "1.0.0",
    author: "Caleb <Codewic/>",
    enabled: true,
    cooldown: 5,
  };

  async execute(context: PluginContext): Promise<PluginResponse> {
    try {
      // Check if this is a reply to a message
      const quotedMessage =
        context.message.message?.extendedTextMessage?.contextInfo
          ?.quotedMessage;

      if (!quotedMessage) {
        await this.sendMessage(
          context,
          "👁️ *View Once Extractor*\n\nReply to a view once message with `.vv` to extract its content.\n\nExample: Reply to a view once photo/video with `.vv`"
        );
        return this.createResponse(true, "VV usage shown");
      }

      await this.react(context, "👁️");

      // Handle viewOnceMessageV2 (new WhatsApp format)
      let actualMessage = quotedMessage;
      if (quotedMessage.viewOnceMessageV2?.message) {
        actualMessage = quotedMessage.viewOnceMessageV2.message;
      }

      // Check for view once image
      if (
        (actualMessage.imageMessage && actualMessage.imageMessage.viewOnce) ||
        (quotedMessage.viewOnceMessageV2 && actualMessage.imageMessage)
      ) {
        try {
          const imageBuffer = await this.downloadMediaMessage(
            context,
            quotedMessage
          );

          if (imageBuffer) {
            const caption = actualMessage.imageMessage?.caption || "";
            await context.sock.sendMessage(context.chatId, {
              image: imageBuffer,
              caption: `${caption}`,
            });

            await this.react(context, "✅");
            return this.createResponse(
              true,
              "View once image extracted successfully"
            );
          }
        } catch (downloadError) {
          await this.sendMessage(
            context,
            "❌ Failed to download view once image. It may have already been viewed or expired."
          );
          await this.react(context, "❌");
          return this.createResponse(
            false,
            `Failed to download image: ${downloadError}`
          );
        }
      }

      // Check for view once video
      else if (
        (actualMessage.videoMessage && actualMessage.videoMessage.viewOnce) ||
        (quotedMessage.viewOnceMessageV2 && actualMessage.videoMessage)
      ) {
        try {
          const videoBuffer = await this.downloadMediaMessage(
            context,
            quotedMessage
          );

          if (videoBuffer) {
            const caption = actualMessage.videoMessage?.caption || "";

            await context.sock.sendMessage(context.chatId, {
              video: videoBuffer,
              caption: `${caption}`,
            });

            await this.react(context, "✅");
            return this.createResponse(
              true,
              "View once video extracted successfully"
            );
          }
        } catch (downloadError) {
          await this.sendMessage(
            context,
            "❌ Failed to download view once video. It may have already been viewed or expired."
          );
          await this.react(context, "❌");
          return this.createResponse(
            false,
            `Failed to download video: ${downloadError}`
          );
        }
      }

      // Check for view once audio
      else if (
        (actualMessage.audioMessage && actualMessage.audioMessage.viewOnce) ||
        (quotedMessage.viewOnceMessageV2 && actualMessage.audioMessage)
      ) {
        try {
          const audioBuffer = await this.downloadMediaMessage(
            context,
            quotedMessage
          );

          if (audioBuffer) {
            await context.sock.sendMessage(context.chatId, {
              audio: audioBuffer,
              mimetype: quotedMessage.audioMessage.mimetype,
            });

            await this.react(context, "✅");
            return this.createResponse(
              true,
              "View once audio extracted successfully"
            );
          }
        } catch (downloadError) {
          await this.sendMessage(
            context,
            "❌ Failed to download view once audio. It may have already been viewed or expired."
          );
          await this.react(context, "❌");
          return this.createResponse(
            false,
            `Failed to download audio: ${downloadError}`
          );
        }
      } else {
        await this.sendMessage(
          context,
          "❌ The replied message is not a view once message or the content is no longer available."
        );
        await this.react(context, "❌");
        return this.createResponse(false, "Not a view once message");
      }

      await this.react(context, "❌");
      return this.createResponse(false, "Failed to extract view once content");
    } catch (error) {
      await this.react(context, "❌");
      return this.createResponse(
        false,
        undefined,
        undefined,
        `Failed to execute VV: ${error}`
      );
    }
  }

  private async downloadMediaMessage(
    context: PluginContext,
    quotedMessage: any
  ): Promise<Buffer | null> {
    try {
      // Import downloadMediaMessage from Baileys
      const { downloadMediaMessage } = await import("@whiskeysockets/baileys");

      // Handle viewOnceMessageV2 structure
      let messageToDownload = quotedMessage;
      if (quotedMessage.viewOnceMessageV2?.message) {
        messageToDownload = quotedMessage.viewOnceMessageV2.message;
      }

      // Create a mock message object for download
      const messageForDownload = {
        key: context.message.message?.extendedTextMessage?.contextInfo
          ?.participant
          ? {
              remoteJid: context.chatId,
              fromMe: false,
              id: context.message.message.extendedTextMessage.contextInfo
                .stanzaId,
              participant:
                context.message.message.extendedTextMessage.contextInfo
                  .participant,
            }
          : {
              remoteJid: context.chatId,
              fromMe: false,
              id: context.message.message?.extendedTextMessage?.contextInfo
                ?.stanzaId,
            },
        message: messageToDownload,
      };

      // Download the media
      const buffer = await downloadMediaMessage(
        messageForDownload,
        "buffer",
        {}
      );

      return buffer as Buffer;
    } catch (error) {
      throw new Error(`Media download failed: ${error}`);
    }
  }
}
