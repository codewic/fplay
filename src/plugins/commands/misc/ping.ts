import { BasePlugin } from '../../basePlugin';
import { PluginMetadata, PluginContext, PluginResponse, PluginCategory } from '../../types';

export default class PingPlugin extends BasePlugin {
  metadata: PluginMetadata = {
    name: 'Ping',
    description: 'Check the bot\'s response time and status',
    commands: ['ping', 'status'],
    category: PluginCategory.MISC,
    version: '1.0.0',
    author: 'Bot Team',
    enabled: true,
    cooldown: 5
  };

  async execute(context: PluginContext): Promise<PluginResponse> {
    const startTime = Date.now();
    
    try {
      // Send initial message
      await this.sendMessage(context, '🏓 Pong! Calculating response time...');
      
      const responseTime = Date.now() - startTime;
      const uptime = this.formatDuration(Math.floor(process.uptime()));
      const memoryUsage = this.formatFileSize(process.memoryUsage().rss);
      
      const statusMessage = `🤖 *Bot Status*
      
📡 *Response Time:* ${responseTime}ms
⏱️ *Uptime:* ${uptime}
💾 *Memory Usage:* ${memoryUsage}
✅ *Status:* Online and Ready!`;

      await this.sendMessage(context, statusMessage);
      
      return this.createResponse(true, 'Ping command executed successfully');
    } catch (error) {
      return this.createResponse(false, undefined, undefined, `Failed to execute ping: ${error}`);
    }
  }
}
