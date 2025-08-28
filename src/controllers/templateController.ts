import { Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import { templateService } from "../services/templateService";
import { AppError } from "../utils/errors";

/**
 * @swagger
 * /templates:
 *   get:
 *     summary: Get all message templates for user
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 */
export const getTemplates = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const templates = await templateService.getUserTemplates(userId);

    res.status(200).json({
      success: true,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /templates/{templateId}:
 *   get:
 *     summary: Get specific template
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template retrieved successfully
 */
export const getTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { templateId } = req.params;
    const userId = req.user!.id;

    const template = await templateService.getTemplate(templateId, userId);

    if (!template) {
      throw new AppError("Template not found", 404);
    }

    res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /templates:
 *   post:
 *     summary: Create new message template
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - content
 *             properties:
 *               name:
 *                 type: string
 *               content:
 *                 type: string
 *               variables:
 *                 type: array
 *                 items:
 *                   type: string
 *               category:
 *                 type: string
 *     responses:
 *       201:
 *         description: Template created successfully
 */
export const createTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { name, content, variables = [], category } = req.body;

    const template = await templateService.createTemplate({
      userId,
      name,
      content,
      variables,
      category,
    });

    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /templates/{templateId}:
 *   put:
 *     summary: Update existing template
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               content:
 *                 type: string
 *               variables:
 *                 type: array
 *                 items:
 *                   type: string
 *               category:
 *                 type: string
 *     responses:
 *       200:
 *         description: Template updated successfully
 */
export const updateTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { templateId } = req.params;
    const userId = req.user!.id;
    const { name, content, variables, category } = req.body;

    const template = await templateService.updateTemplate(templateId, userId, {
      name,
      content,
      variables,
      category,
    });

    if (!template) {
      throw new AppError("Template not found", 404);
    }

    res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /templates/{templateId}:
 *   delete:
 *     summary: Delete template
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template deleted successfully
 */
export const deleteTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { templateId } = req.params;
    const userId = req.user!.id;

    const deleted = await templateService.deleteTemplate(templateId, userId);

    if (!deleted) {
      throw new AppError("Template not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
