import { Request } from "express";
import { WASocket } from "@whiskeysockets/baileys";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
  body: any;
}

export interface QRCodeResponse {
  qrCode: string;
  sessionId: string;
}

export interface SessionStatusResponse {
  sessionId: string;
  status: string;
  phoneNumber?: string;
  lastSeen?: Date;
}

export interface SendMessageRequest {
  to: string;
  message: string;
  type?: "text" | "image" | "document";
}

export interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BaileysSession {
  sock: WASocket;
  qr?: string;
  pairingCode?: string;
  phoneNumber?: string;
  status: "pending" | "connecting" | "connected" | "disconnected" | "error";
}
