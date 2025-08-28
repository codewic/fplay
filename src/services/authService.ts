import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../config/database";
import { AppError } from "../utils/errors";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  async register(email: string, password: string, name?: string) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError("User already exists", 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate refresh token
    const refreshToken = this.generateRefreshToken();

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        refreshToken,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const tokens = this.generateTokens(user.id);

    return { user, ...tokens };
  }

  async login(email: string, password: string) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new AppError("Invalid credentials", 401);
    }

    // Generate new refresh token
    const refreshToken = this.generateRefreshToken();

    // Update user with new refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    // Generate tokens
    const tokens = this.generateTokens(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      ...tokens,
    };
  }

  private generateTokens(userId: string): TokenPair {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new AppError("JWT_SECRET is not configured", 500);
    }

    const payload = { id: userId };

    // Generate access token (short-lived)
    const accessToken = jwt.sign(payload, jwtSecret, {
      expiresIn: parseInt(process.env.JWT_ACCESS_EXPIRES_IN) || 3600,
    });

    // Generate refresh token (long-lived)
    const refreshToken = jwt.sign(payload, jwtSecret, {
      expiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN) || 604800,
    });

    return { accessToken, refreshToken };
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString("hex");
  }

  // Legacy method for backward compatibility
  private generateToken(userId: string): string {
    const tokens = this.generateTokens(userId);
    return tokens.accessToken;
  }

  async refreshTokens(refreshToken: string) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new AppError("JWT_SECRET is not configured", 500);
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, jwtSecret) as { id: string };

      // Find user and verify refresh token
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, name: true, refreshToken: true },
      });

      if (!user) {
        throw new AppError("User not found", 404);
      }

      // Generate new tokens
      const tokens = this.generateTokens(user.id);

      // Generate new refresh token for storage
      const newRefreshToken = this.generateRefreshToken();

      // Update user with new refresh token
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: newRefreshToken },
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        ...tokens,
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError("Invalid refresh token", 401);
      }
      throw error;
    }
  }

  async logout(userId: string) {
    // Invalidate refresh token
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  async validateRefreshToken(
    userId: string,
    refreshToken: string
  ): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { refreshToken: true },
    });

    return user?.refreshToken === refreshToken;
  }

  // Legacy method - kept for backward compatibility
  async refreshToken(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const token = this.generateToken(user.id);
    return { user, token };
  }
}

export const authService = new AuthService();
