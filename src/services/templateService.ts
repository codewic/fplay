import { prisma } from "../config/database";
import { logger } from "../utils/logger";

interface CreateTemplateData {
  userId: string;
  name: string;
  content: string;
  variables: string[];
  category?: string;
}

interface UpdateTemplateData {
  name?: string;
  content?: string;
  variables?: string[];
  category?: string;
}

class TemplateService {
  async getUserTemplates(userId: string) {
    try {
      const templates = await prisma.template.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      return templates.map((template) => ({
        ...template,
        variables: Array.isArray(template.variables) 
          ? template.variables 
          : JSON.parse(template.variables as string),
      }));
    } catch (error) {
      logger.error("Error fetching user templates:", error);
      throw error;
    }
  }

  async getTemplate(templateId: string, userId: string) {
    try {
      const template = await prisma.template.findFirst({
        where: {
          id: templateId,
          userId,
        },
      });

      if (!template) {
        return null;
      }

      return {
        ...template,
        variables: Array.isArray(template.variables) 
          ? template.variables 
          : JSON.parse(template.variables as string),
      };
    } catch (error) {
      logger.error("Error fetching template:", error);
      throw error;
    }
  }

  async createTemplate(data: CreateTemplateData) {
    try {
      const template = await prisma.template.create({
        data: {
          userId: data.userId,
          name: data.name,
          content: data.content,
          variables: data.variables,
          category: data.category,
        },
      });

      return {
        ...template,
        variables: Array.isArray(template.variables) 
          ? template.variables 
          : JSON.parse(template.variables as string),
      };
    } catch (error) {
      logger.error("Error creating template:", error);
      throw error;
    }
  }

  async updateTemplate(templateId: string, userId: string, data: UpdateTemplateData) {
    try {
      const template = await prisma.template.updateMany({
        where: {
          id: templateId,
          userId,
        },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.content && { content: data.content }),
          ...(data.variables && { variables: data.variables }),
          ...(data.category !== undefined && { category: data.category }),
          updatedAt: new Date(),
        },
      });

      if (template.count === 0) {
        return null;
      }

      // Fetch the updated template
      return await this.getTemplate(templateId, userId);
    } catch (error) {
      logger.error("Error updating template:", error);
      throw error;
    }
  }

  async deleteTemplate(templateId: string, userId: string) {
    try {
      const result = await prisma.template.deleteMany({
        where: {
          id: templateId,
          userId,
        },
      });

      return result.count > 0;
    } catch (error) {
      logger.error("Error deleting template:", error);
      throw error;
    }
  }

  // Helper method to extract variables from template content
  extractVariables(content: string): string[] {
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  // Helper method to replace variables in template content
  replaceVariables(content: string, variables: Record<string, string>): string {
    let result = content;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    });

    return result;
  }
}

export const templateService = new TemplateService();
