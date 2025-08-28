import { BasePlugin } from '../../basePlugin';
import { PluginMetadata, PluginContext, PluginResponse, PluginCategory } from '../../types';

export default class TagPlugin extends BasePlugin {
  metadata: PluginMetadata = {
    name: 'Tag',
    description: 'Tag members in the group based on your choice',
    commands: ['tag', 'tagall', 'everyone'],
    category: PluginCategory.GROUP,
    version: '1.0.0',
    author: 'Bot Team',
    enabled: true,
    groupOnly: true,
    adminOnly: true,
    cooldown: 30
  };

  async execute(context: PluginContext): Promise<PluginResponse> {
    try {
      if (!context.isGroup) {
        await this.sendMessage(context, '❌ This command can only be used in groups.');
        return this.createResponse(false, 'Command is group only');
      }

      const option = context.args[1]?.toLowerCase();
      const customMessage = context.args.slice(2).join(' ');

      let groupMetadata;
      try {
        groupMetadata = await context.sock.groupMetadata(context.chatId);
      } catch (error) {
        await this.sendMessage(context, '❌ Failed to get group information.');
        return this.createResponse(false, 'Failed to get group metadata');
      }

      let targetMembers: string[] = [];
      let tagType = '';

      switch (option) {
        case 'all':
        case 'everyone':
          targetMembers = groupMetadata.participants.map(p => p.id);
          tagType = 'All Members';
          break;
        
        case 'admin':
        case 'admins':
          targetMembers = groupMetadata.participants
            .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
            .map(p => p.id);
          tagType = 'Admins';
          break;
        
        case 'notadmin':
        case 'members':
          targetMembers = groupMetadata.participants
            .filter(p => !p.admin || p.admin === null)
            .map(p => p.id);
          tagType = 'Non-Admin Members';
          break;
        
        default:
          const usage = `📢 *Tag Command Usage*

• \`.tag all\` - Mention all members
• \`.tag admin\` - Mention only admins  
• \`.tag notadmin\` - Mention non-admin members

You can add a custom message:
\`.tag all Your message here\``;

          await this.sendMessage(context, usage);
          return this.createResponse(true, 'Tag usage shown');
      }

      if (targetMembers.length === 0) {
        await this.sendMessage(context, `❌ No ${tagType.toLowerCase()} found in this group.`);
        return this.createResponse(false, 'No target members found');
      }

      // Create mention text
      const mentionText = targetMembers.map(id => `@${id.split('@')[0]}`).join(' ');
      
      let message = `📢 *Tagging ${tagType}*\n\n`;
      if (customMessage) {
        message += `💬 ${customMessage}\n\n`;
      }
      message += mentionText;

      await context.sock.sendMessage(context.chatId, {
        text: message,
        mentions: targetMembers
      });

      return this.createResponse(true, `Tagged ${targetMembers.length} ${tagType.toLowerCase()}`);
    } catch (error) {
      return this.createResponse(false, undefined, undefined, `Failed to execute tag: ${error}`);
    }
  }
}
