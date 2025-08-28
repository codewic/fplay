import {
  BotContent,
  ContentType,
  ContentDeliveryOptions,
  BotStats,
  UserContext,
  ContentTemplate,
} from "./types";
import {
  welcomeTemplate,
  defaultWelcomeContent,
  guideTemplate,
  defaultGuideContent,
  menuTemplate,
  formatCommandCategories,
  defaultMenuCategories,
  helpTemplate,
  formatHelpCommandList,
  listTemplate,
  formatCommandDescriptions,
  defaultCommandDescriptions,
} from "./templates";
import { logger } from "../utils/logger";
import { whatsappService } from "../services/whatsappService";

class ContentService {
  private templates: Map<ContentType, ContentTemplate> = new Map();
  private defaultContent: Map<ContentType, any> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    // Register templates
    this.templates.set(ContentType.WELCOME, welcomeTemplate);
    this.templates.set(ContentType.GUIDE, guideTemplate);
    this.templates.set(ContentType.MENU, menuTemplate);
    this.templates.set(ContentType.HELP, helpTemplate);
    this.templates.set(ContentType.LIST, listTemplate);

    // Register default content
    this.defaultContent.set(ContentType.WELCOME, defaultWelcomeContent);
    this.defaultContent.set(ContentType.GUIDE, defaultGuideContent);
    this.defaultContent.set(ContentType.MENU, defaultMenuCategories);
    this.defaultContent.set(ContentType.LIST, defaultCommandDescriptions);
  }

  async getContent(
    type: ContentType,
    options: ContentDeliveryOptions = {}
  ): Promise<string> {
    try {
      const template = this.templates.get(type);
      if (!template) {
        throw new Error(`Template not found for content type: ${type}`);
      }

      const variables = await this.buildVariables(type, options);
      return this.processTemplate(template.template, variables);
    } catch (error) {
      logger.error(`Error getting content for type ${type}:`, error);
      return `Error loading ${type} content. Please try again later.`;
    }
  }

  private async buildVariables(
    type: ContentType,
    options: ContentDeliveryOptions
  ): Promise<Record<string, string>> {
    const variables: Record<string, string> = {};
    const defaultVars = this.defaultContent.get(type) || {};

    // Add default variables
    Object.assign(variables, defaultVars);

    // Add custom variables
    if (options.customVariables) {
      Object.assign(variables, options.customVariables);
    }

    // Add dynamic variables based on type
    switch (type) {
      case ContentType.MENU:
      case ContentType.HELP:
        this.addBotStatsVariables(variables, options.botStats);
        this.addUserContextVariables(variables, options.userContext);
        this.addTimeVariables(variables);

        if (type === ContentType.MENU) {
          variables.commandCategories = formatCommandCategories(defaultVars);
          variables.botName = options.botStats?.platform || "WixTron";
        } else {
          // Help content - format command list
          const allCommands = defaultCommandDescriptions.map((cmd) =>
            cmd.command.toUpperCase()
          );
          variables.commandList = formatHelpCommandList(allCommands);
          variables.botName = options.botStats?.platform || "WixTron";
        }
        break;

      case ContentType.LIST:
        variables.commandDescriptions = formatCommandDescriptions(defaultVars);
        break;

      case ContentType.GUIDE:
        this.addBotStatsVariables(variables, options.botStats);
        break;
    }

    return variables;
  }

  private addBotStatsVariables(
    variables: Record<string, string>,
    stats?: BotStats
  ): void {
    if (stats) {
      variables.version = stats.version;
      variables.plugins = stats.plugins.toString();
      variables.ePlugins = stats.ePlugins?.toString() || "0";
      variables.sudo = stats.sudo?.toString() || "0";
      variables.uptime = stats.uptime;
      variables.ram = stats.ram;
      variables.platform = stats.platform;

      // Feature flags
      Object.entries(stats.features || {}).forEach(([key, value]) => {
        variables[key] = value ? "✅" : "❎";
      });
    } else {
      // Default values
      variables.version = "4.0.7";
      variables.plugins = "215";
      variables.ePlugins = "46";
      variables.sudo = "0";
      variables.uptime = "0h 0m 0s";
      variables.ram = "0/0MB";
      variables.platform = "codewic (render (Linux aws)";
    }
  }

  private addUserContextVariables(
    variables: Record<string, string>,
    context?: UserContext
  ): void {
    if (context) {
      variables.userName = context.name || "User";
    } else {
      variables.userName = "User";
    }
  }

  private addTimeVariables(variables: Record<string, string>): void {
    const now = new Date();
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };

    variables.time = now.toLocaleTimeString("en-US", timeOptions);
    variables.day = now.toLocaleDateString("en-US", { weekday: "long" });
    variables.date = now.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    variables.prefix = ".";
  }

  private processTemplate(
    template: string,
    variables: Record<string, string>
  ): string {
    let processed = template;

    // Replace all variables in the format {{variableName}}
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      processed = processed.replace(regex, value);
    });

    // Remove any unreplaced variables
    processed = processed.replace(/\{\{[^}]+\}\}/g, "");

    return processed;
  }

  // Method to send content automatically on connection/restart
  async sendWelcomeContent(
    sessionId: string,
    userId: string,
    options: ContentDeliveryOptions = {}
  ): Promise<void> {
    try {
      const welcomeMessage = await this.getContent(
        ContentType.WELCOME,
        options
      );

      logger.info(
        `Sending welcome content to session ${sessionId}:`,
        welcomeMessage
      );

      // Get the user's phone number from the session context
      const phoneNumber = options.userContext?.phoneNumber;
      if (!phoneNumber) {
        logger.warn(`No phone number available for welcome message in session ${sessionId}`);
        return;
      }

      // Send welcome message to the user's own WhatsApp number
      const recipientJid = `${phoneNumber}@s.whatsapp.net`;
      await whatsappService.sendMessage(sessionId, recipientJid, welcomeMessage);
    } catch (error) {
      logger.error(
        `Error sending welcome content to session ${sessionId}:`,
        { error: error.message, stack: error.stack }
      );
    }
  }

  async sendGuideContent(
    sessionId: string,
    options: ContentDeliveryOptions = {}
  ): Promise<string> {
    return await this.getContent(ContentType.GUIDE, options);
  }

  async sendMenuContent(
    sessionId: string,
    options: ContentDeliveryOptions = {}
  ): Promise<string> {
    return await this.getContent(ContentType.MENU, options);
  }

  async sendHelpContent(
    sessionId: string,
    options: ContentDeliveryOptions = {}
  ): Promise<string> {
    return await this.getContent(ContentType.HELP, options);
  }

  async sendListContent(
    sessionId: string,
    options: ContentDeliveryOptions = {}
  ): Promise<string> {
    return await this.getContent(ContentType.LIST, options);
  }

  // Method to get bot statistics (would integrate with your actual bot stats)
  async getBotStats(): Promise<BotStats> {
    // This would fetch real stats from your system
    return {
      version: "4.0.7",
      plugins: 215,
      ePlugins: 46,
      sudo: 0,
      uptime: this.getUptime(),
      ram: this.getRamUsage(),
      platform: "codewic (Linux aws)",
      features: {
        autoReadMsg: false,
        autoStatusView: false,
        autoRejectCall: false,
        alwaysOnline: true,
        antiDeleteMsg: true,
        autoUpdateBot: true,
      },
    };
  }

  private getUptime(): string {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  private getRamUsage(): string {
    const used = process.memoryUsage();
    const total = 31386; // Example total RAM in MB
    const usedMB = Math.round(used.rss / 1024 / 1024);
    return `${usedMB}/${total}MB`;
  }
}

export const contentService = new ContentService();
