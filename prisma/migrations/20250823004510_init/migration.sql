-- CreateEnum
CREATE TYPE "public"."SessionStatus" AS ENUM ('PENDING', 'CONNECTING', 'CONNECTED', 'DISCONNECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."MessageType" AS ENUM ('TEXT', 'IMAGE', 'DOCUMENT', 'AUDIO', 'VIDEO', 'STICKER', 'LOCATION', 'CONTACT');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "status" "public"."SessionStatus" NOT NULL DEFAULT 'PENDING',
    "qrCode" TEXT,
    "encryptedCreds" TEXT,
    "lastSeen" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bot_configs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'WhatsApp Bot',
    "welcomeMessage" TEXT,
    "autoReply" BOOLEAN NOT NULL DEFAULT false,
    "autoReplyMessage" TEXT,
    "webhookUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "fromMe" BOOLEAN NOT NULL,
    "remoteJid" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "content" TEXT,
    "messageType" "public"."MessageType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionId_key" ON "public"."sessions"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "bot_configs_sessionId_key" ON "public"."bot_configs"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "messages_messageId_key" ON "public"."messages"("messageId");

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bot_configs" ADD CONSTRAINT "bot_configs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
