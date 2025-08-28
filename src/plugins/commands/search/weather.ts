import { BasePlugin } from '../../basePlugin';
import { PluginMetadata, PluginContext, PluginResponse, PluginCategory } from '../../types';

export default class WeatherPlugin extends BasePlugin {
  metadata: PluginMetadata = {
    name: 'Weather',
    description: 'Get weather information for any location',
    commands: ['weather', 'w'],
    category: PluginCategory.SEARCH,
    version: '1.0.0',
    author: 'Bot Team',
    enabled: true,
    cooldown: 15
  };

  async execute(context: PluginContext): Promise<PluginResponse> {
    try {
      const location = context.args.slice(1).join(' ');
      
      if (!location) {
        await this.sendMessage(context, '🌤️ *Weather Information*\n\nUsage: `.weather <location>`\n\nExample: `.weather New York`\nExample: `.weather London, UK`');
        return this.createResponse(true, 'Weather usage shown');
      }

      await this.react(context, '🌤️');

      // Mock weather data
      const mockWeather = `🌤️ *Weather in ${location}*

🌡️ **Temperature:** 22°C (72°F)
💧 **Humidity:** 65%
💨 **Wind:** 15 km/h NE
☁️ **Condition:** Partly Cloudy
👁️ **Visibility:** 10 km
🌅 **Sunrise:** 06:30 AM
🌇 **Sunset:** 07:45 PM

📅 **5-Day Forecast:**
• Today: 22°C | Partly Cloudy
• Tomorrow: 25°C | Sunny
• Day 3: 20°C | Light Rain
• Day 4: 18°C | Cloudy
• Day 5: 24°C | Sunny

*Note: This is demo data. Configure a weather API (OpenWeatherMap, etc.) for real weather information.*`;

      await this.sendMessage(context, mockWeather);
      await this.react(context, '✅');

      return this.createResponse(true, 'Weather command executed successfully');
    } catch (error) {
      await this.react(context, '❌');
      return this.createResponse(false, undefined, undefined, `Failed to execute weather: ${error}`);
    }
  }
}
