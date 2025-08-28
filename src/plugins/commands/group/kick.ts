import { BasePlugin } from '../../basePlugin';
import { PluginMetadata, PluginContext, PluginResponse, PluginCategory } from '../../types';

export default class KickPlugin extends BasePlugin {
  metadata: PluginMetadata = {
    name: 'Kick',
    description: 'Remove members from the group',
    commands: ['kick', 'remove'],
    category: PluginCategory.GROUP,
    version: '1.0.0',
    author: 'Bot Team',
    enabled: true,
    groupOnly: true,
    adminOnly: true,
    cooldown: 5
  };

  async execute(context: PluginContext): Promise<PluginResponse> {
    try {
      if (!context.isGroup) {
        await this.sendMessage(context, '❌ This command can only be used in groups.');
        return this.createResponse(false, 'Command is group only');
      }

      if (!context.isAdmin) {
        await this.sendMessage(context, '❌ Only group admins can use this command.');
        return this.createResponse(false, 'User is not admin');
      }

      // Get mentioned users or quoted message
      const quotedMessage = context.message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const mentionedJids = context.message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      
      let targetUsers: string[] = [];

      // Check for mentions
      if (mentionedJids.length > 0) {
        targetUsers = mentionedJids;
      } 
      // Check for quoted message
      else if (quotedMessage) {
        const quotedParticipant = context.message.message?.extendedTextMessage?.contextInfo?.participant;
        if (quotedParticipant) {
          targetUsers = [quotedParticipant];
        }
      }
      // Check for phone number in args
      else if (context.args[1]) {
        const phoneNumber = context.args[1].replace(/[^\d]/g, '');
        if (phoneNumber.length >= 10) {
          targetUsers = [`${phoneNumber}@s.whatsapp.net`];
        }
      }

      if (targetUsers.length === 0) {
        await this.sendMessage(context, '❌ Please mention users, reply to a message, or provide a phone number to kick.\n\nUsage:\n• `.kick @user1 @user2`\n• Reply to a message and use `.kick`\n• `.kick 1234567890`');
        return this.createResponse(false, 'No target users specified');
      }

      // Check if bot is admin
      let groupMetadata;
      try {
        groupMetadata = await context.sock.groupMetadata(context.chatId);
      } catch (error) {
        await this.sendMessage(context, '❌ Failed to get group information.');
        return this.createResponse(false, 'Failed to get group metadata');
      }

      const botJid = context.sock.user?.id;
      const botParticipant = groupMetadata.participants.find((p: any) => p.id === botJid);
      
      if (!botParticipant || (!botParticipant.admin)) {
        await this.sendMessage(context, '❌ I need to be an admin to kick members.');
        return this.createResponse(false, 'Bot is not admin');
      }

      // Filter out admins and the command sender
      const validTargets = targetUsers.filter(jid => {
        const participant = groupMetadata.participants.find((p: any) => p.id === jid);
        return participant && !participant.admin && jid !== context.sender;
      });

      if (validTargets.length === 0) {
        await this.sendMessage(context, '❌ Cannot kick admins or yourself.');
        return this.createResponse(false, 'No valid targets');
      }

      // Kick users
      try {
        await context.sock.groupParticipantsUpdate(context.chatId, validTargets, 'remove');
        
        const kickedUsers = validTargets.map(jid => `@${jid.split('@')[0]}`).join(', ');
        await context.sock.sendMessage(context.chatId, {
          text: `👋 Removed ${kickedUsers} from the group.`,
          mentions: validTargets
        });

        return this.createResponse(true, `Kicked ${validTargets.length} users`);
      } catch (error) {
        await this.sendMessage(context, '❌ Failed to remove users. Make sure I have the necessary permissions.');
        return this.createResponse(false, `Failed to kick users: ${error}`);
      }
    } catch (error) {
      return this.createResponse(false, undefined, undefined, `Failed to execute kick: ${error}`);
    }
  }
}
