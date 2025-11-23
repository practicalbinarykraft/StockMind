// Encryption utilities for API keys
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Encryption configuration
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set for API key encryption");
}

export const ENCRYPTION_KEY = process.env.SESSION_SECRET.slice(0, 32).padEnd(32, '0');
export const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypts an API key using AES-256-CBC encryption
 * @param key - The plain text API key to encrypt
 * @returns The encrypted key in format: iv:encrypted
 */
export function encryptApiKey(key: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(key, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypts an encrypted API key
 * @param encryptedKey - The encrypted key in format: iv:encrypted
 * @returns The decrypted plain text API key
 */
export function decryptApiKey(encryptedKey: string): string {
  const parts = encryptedKey.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
