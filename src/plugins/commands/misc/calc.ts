import { BasePlugin } from '../../basePlugin';
import { PluginMetadata, PluginContext, PluginResponse, PluginCategory } from '../../types';

export default class CalcPlugin extends BasePlugin {
  metadata: PluginMetadata = {
    name: 'Calculator',
    description: 'Perform basic mathematical calculations',
    commands: ['calc', 'calculate', 'math'],
    category: PluginCategory.MISC,
    version: '1.0.0',
    author: 'Bot Team',
    enabled: true,
    cooldown: 3
  };

  async execute(context: PluginContext): Promise<PluginResponse> {
    try {
      const expression = context.args.slice(1).join(' ');
      
      if (!expression) {
        await this.sendMessage(context, '🧮 *Calculator*\n\nUsage: `.calc <expression>`\n\nExample: `.calc 2 + 2 * 3`');
        return this.createResponse(true, 'Calculator usage shown');
      }

      // Sanitize expression - only allow numbers, operators, parentheses, and spaces
      const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
      
      if (!sanitized) {
        await this.sendMessage(context, '❌ Invalid expression. Please use only numbers and basic operators (+, -, *, /, ())');
        return this.createResponse(false, 'Invalid expression');
      }

      try {
        // Use Function constructor for safe evaluation
        const result = Function(`"use strict"; return (${sanitized})`)();
        
        if (typeof result !== 'number' || !isFinite(result)) {
          throw new Error('Invalid result');
        }

        const responseMessage = `🧮 *Calculator*

📝 Expression: \`${expression}\`
✅ Result: \`${result}\``;

        await this.sendMessage(context, responseMessage);
        return this.createResponse(true, 'Calculation completed successfully');
      } catch (evalError) {
        await this.sendMessage(context, '❌ Invalid mathematical expression. Please check your syntax.');
        return this.createResponse(false, 'Invalid mathematical expression');
      }
    } catch (error) {
      return this.createResponse(false, undefined, undefined, `Failed to execute calc: ${error}`);
    }
  }
}
