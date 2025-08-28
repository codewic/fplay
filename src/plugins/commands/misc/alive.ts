import { BasePlugin } from '../../basePlugin';
import { PluginMetadata, PluginContext, PluginResponse, PluginCategory } from '../../types';

export default class AlivePlugin extends BasePlugin {
  metadata: PluginMetadata = {
    name: 'Alive',
    description: 'Display the bot\'s alive status message with optional custom text',
    commands: ['alive'],
    category: PluginCategory.MISC,
    version: '1.0.0',
    author: 'Bot Team',
    enabled: true,
    cooldown: 10
  };

  async execute(context: PluginContext): Promise<PluginResponse> {
    try {
      const customMessage = context.args.slice(1).join(' ');
      const uptime = this.formatDuration(Math.floor(process.uptime()));
      
      let aliveMessage = `🤖 *I'm Alive!*

✅ Bot is running smoothly
⏱️ Uptime: ${uptime}
🔋 Status: Active and Ready
📡 All systems operational`;

      if (customMessage) {
        aliveMessage += `\n\n💬 *Custom Message:*\n${customMessage}`;
      }

      await this.sendMessage(context, aliveMessage);
      
      return this.createResponse(true, 'Alive command executed successfully');
    } catch (error) {
      return this.createResponse(false, undefined, undefined, `Failed to execute alive: ${error}`);
    }
  }
}
