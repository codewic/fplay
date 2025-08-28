import crypto from "crypto";

const algorithm = "aes-256-cbc";

// Generate or use encryption key (32 bytes for AES-256)
const getEncryptionKey = (): Buffer => {
  if (process.env.ENCRYPTION_KEY) {
    const envKey = process.env.ENCRYPTION_KEY;
    // If it's a hex string, convert it
    if (envKey.length === 64) {
      return Buffer.from(envKey, "hex");
    }
    // If it's a regular string, hash it to get consistent 32 bytes
    return crypto.createHash("sha256").update(envKey).digest();
  }
  // Generate a new 32-byte key
  return crypto.randomBytes(32);
};

const key = getEncryptionKey();

export const encrypt = (text: string): string => {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
  } catch (error) {
    console.error("Encryption error:", {
      keyLength: key.length,
      algorithm,
      error: error.message
    });
    throw error;
  }
};

export const decrypt = (text: string): string => {
  const textParts = text.split(":");
  const iv = Buffer.from(textParts.shift()!, "hex");
  const encryptedText = textParts.join(":");
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};
