import { IPlugin, PluginContext, PluginResponse, PluginLoadResult, CommandCooldown, PluginConfig } from './types';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export class PluginManager {
  private plugins: Map<string, IPlugin> = new Map();
  private commandMap: Map<string, string> = new Map(); // command -> plugin name
  private cooldowns: Map<string, CommandCooldown> = new Map();
  private pluginConfigs: Map<string, PluginConfig> = new Map();
  private pluginsDirectory: string;

  constructor() {
    this.pluginsDirectory = path.join(__dirname, 'commands');
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Plugin Manager...');
    await this.loadAllPlugins();
    logger.info(`Plugin Manager initialized with ${this.plugins.size} plugins`);
    logger.info(`Total commands registered: ${this.commandMap.size}`);
    logger.info(`Command map: ${JSON.stringify(Object.fromEntries(this.commandMap))}`);
  }

  private async loadAllPlugins(): Promise<void> {
    try {
      if (!fs.existsSync(this.pluginsDirectory)) {
        fs.mkdirSync(this.pluginsDirectory, { recursive: true });
        logger.info(`Created plugins directory: ${this.pluginsDirectory}`);
        return;
      }

      const categories = fs.readdirSync(this.pluginsDirectory, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const category of categories) {
        await this.loadCategoryPlugins(category);
      }
    } catch (error) {
      logger.error('Error loading plugins:', error);
    }
  }

  private async loadCategoryPlugins(category: string): Promise<void> {
    const categoryPath = path.join(this.pluginsDirectory, category);
    
    try {
      const files = fs.readdirSync(categoryPath)
        .filter(file => file.endsWith('.ts') || file.endsWith('.js'));

      for (const file of files) {
        await this.loadPlugin(category, file);
      }
    } catch (error) {
      logger.error(`Error loading plugins from category ${category}:`, error);
    }
  }

  private async loadPlugin(category: string, filename: string): Promise<PluginLoadResult> {
    try {
      const pluginPath = path.join(this.pluginsDirectory, category, filename);
      const pluginName = path.parse(filename).name;

      // Dynamic import
      const pluginModule = await import(pluginPath);
      const PluginClass = pluginModule.default || pluginModule[Object.keys(pluginModule)[0]];

      if (!PluginClass) {
        throw new Error(`No plugin class found in ${pluginPath}`);
      }

      const plugin: IPlugin = new PluginClass();
      
      // Validate plugin
      if (!plugin.metadata || !plugin.execute) {
        throw new Error(`Invalid plugin structure in ${pluginPath}`);
      }

      // Register plugin
      this.plugins.set(pluginName, plugin);
      
      // Register commands
      for (const command of plugin.metadata.commands) {
        this.commandMap.set(command.toLowerCase(), pluginName);
      }

      // Load plugin config
      this.loadPluginConfig(pluginName, plugin);

      // Call onLoad if available
      if (plugin.onLoad) {
        await plugin.onLoad();
      }

      logger.info(`Loaded plugin: ${plugin.metadata.name} (${plugin.metadata.commands.join(', ')})`);
      logger.info(`Plugin commands registered: ${plugin.metadata.commands.map(cmd => `${cmd} -> ${pluginName}`).join(', ')}`);
      
      return { success: true, plugin };
    } catch (error) {
      logger.error(`Failed to load plugin ${filename}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private loadPluginConfig(pluginName: string, plugin: IPlugin): void {
    const defaultConfig: PluginConfig = {
      enabled: plugin.metadata.enabled,
      adminOnly: plugin.metadata.adminOnly || false,
      groupOnly: plugin.metadata.groupOnly || false,
      cooldown: plugin.metadata.cooldown || 0
    };

    this.pluginConfigs.set(pluginName, defaultConfig);
  }

  async executeCommand(context: PluginContext): Promise<PluginResponse | null> {
    const command = context.args[0]?.toLowerCase();
    
    logger.info(`PluginManager.executeCommand called with command: ${command}`);
    logger.info(`Available commands: ${Array.from(this.commandMap.keys()).join(', ')}`);
    
    if (!command || !command.startsWith('.')) {
      logger.info('Command does not start with . or is empty');
      return null;
    }

    const cleanCommand = command.substring(1); // Remove the '.' prefix
    logger.info(`Looking for plugin for clean command: ${cleanCommand}`);
    const pluginName = this.commandMap.get(cleanCommand);

    if (!pluginName) {
      logger.info(`No plugin found for command: ${cleanCommand}`);
      return null; // Command not found
    }
    
    logger.info(`Found plugin: ${pluginName} for command: ${cleanCommand}`);

    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      return this.createErrorResponse(`Plugin ${pluginName} not found`);
    }

    const config = this.pluginConfigs.get(pluginName);
    if (!config || !config.enabled) {
      return this.createErrorResponse(`Plugin ${pluginName} is disabled`);
    }

    try {
      // Check permissions
      if (!await plugin.validatePermissions?.(context)) {
        return this.createErrorResponse('Insufficient permissions to use this command');
      }

      // Check cooldown
      if (!this.checkCooldown(context.userId, cleanCommand, config.cooldown)) {
        const remainingTime = this.getRemainingCooldown(context.userId, cleanCommand, config.cooldown);
        return this.createErrorResponse(`Command on cooldown. Try again in ${remainingTime}s`);
      }

      // Execute plugin
      const response = await plugin.execute(context);
      
      // Update cooldown
      this.updateCooldown(context.userId, cleanCommand);
      
      return response;
    } catch (error) {
      logger.error(`Error executing plugin ${pluginName}:`, error);
      return this.createErrorResponse(`Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private checkCooldown(userId: string, command: string, cooldownSeconds: number): boolean {
    if (cooldownSeconds <= 0) return true;

    const key = `${userId}:${command}`;
    const cooldown = this.cooldowns.get(key);

    if (!cooldown) return true;

    const now = new Date();
    const timeDiff = (now.getTime() - cooldown.lastUsed.getTime()) / 1000;

    return timeDiff >= cooldownSeconds;
  }

  private getRemainingCooldown(userId: string, command: string, cooldownSeconds: number): number {
    const key = `${userId}:${command}`;
    const cooldown = this.cooldowns.get(key);

    if (!cooldown) return 0;

    const now = new Date();
    const timeDiff = (now.getTime() - cooldown.lastUsed.getTime()) / 1000;
    const remaining = cooldownSeconds - timeDiff;

    return Math.max(0, Math.ceil(remaining));
  }

  private updateCooldown(userId: string, command: string): void {
    const key = `${userId}:${command}`;
    this.cooldowns.set(key, {
      userId,
      command,
      lastUsed: new Date()
    });
  }

  private createErrorResponse(error: string): PluginResponse {
    return {
      success: false,
      error
    };
  }

  async reloadPlugin(pluginName: string): Promise<PluginLoadResult> {
    try {
      // Unload existing plugin
      const existingPlugin = this.plugins.get(pluginName);
      if (existingPlugin) {
        if (existingPlugin.onUnload) {
          await existingPlugin.onUnload();
        }
        
        // Remove from maps
        this.plugins.delete(pluginName);
        for (const command of existingPlugin.metadata.commands) {
          this.commandMap.delete(command.toLowerCase());
        }
        this.pluginConfigs.delete(pluginName);
      }

      // Find and reload plugin
      const categories = fs.readdirSync(this.pluginsDirectory, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const category of categories) {
        const categoryPath = path.join(this.pluginsDirectory, category);
        const files = fs.readdirSync(categoryPath);
        
        for (const file of files) {
          const fileName = path.parse(file).name;
          if (fileName === pluginName) {
            return await this.loadPlugin(category, file);
          }
        }
      }

      return { success: false, error: `Plugin ${pluginName} not found` };
    } catch (error) {
      logger.error(`Error reloading plugin ${pluginName}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  getPluginInfo(pluginName: string): IPlugin | undefined {
    return this.plugins.get(pluginName);
  }

  getAllPlugins(): Map<string, IPlugin> {
    return new Map(this.plugins);
  }

  getPluginsByCategory(category: string): IPlugin[] {
    return Array.from(this.plugins.values())
      .filter(plugin => plugin.metadata.category === category);
  }

  getAvailableCommands(): string[] {
    return Array.from(this.commandMap.keys());
  }

  updatePluginConfig(pluginName: string, config: Partial<PluginConfig>): boolean {
    const existingConfig = this.pluginConfigs.get(pluginName);
    if (!existingConfig) return false;

    this.pluginConfigs.set(pluginName, { ...existingConfig, ...config });
    return true;
  }

  getPluginConfig(pluginName: string): PluginConfig | undefined {
    return this.pluginConfigs.get(pluginName);
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down Plugin Manager...');
    
    for (const [name, plugin] of this.plugins) {
      try {
        if (plugin.onUnload) {
          await plugin.onUnload();
        }
      } catch (error) {
        logger.error(`Error unloading plugin ${name}:`, error);
      }
    }

    this.plugins.clear();
    this.commandMap.clear();
    this.cooldowns.clear();
    this.pluginConfigs.clear();
    
    logger.info('Plugin Manager shutdown complete');
  }
}

export const pluginManager = new PluginManager();
