import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits

/**
 * Derives a 32-byte key from SESSION_SECRET using scrypt
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is required for encryption');
  }
  
  // Use scrypt to derive a proper 32-byte key from the session secret
  // Salt is fixed for deterministic key generation (same secret = same key)
  const salt = 'reelrepurposer-ig-analytics';
  return scryptSync(secret, salt, KEY_LENGTH);
}

/**
 * Encrypts a plaintext string (e.g., Instagram access token)
 * Returns format: iv:encrypted (both base64 encoded)
 */
export function encrypt(plaintext: string): string {
  try {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    
    const cipher = createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Format: iv:ciphertext (both base64)
    return `${iv.toString('base64')}:${encrypted}`;
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypts an encrypted string back to plaintext
 * Expects format: iv:encrypted (both base64 encoded)
 */
export function decrypt(encrypted: string): string {
  try {
    const key = getEncryptionKey();
    
    // Parse iv:ciphertext format
    const parts = encrypted.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted format (expected iv:ciphertext)');
    }
    
    const iv = Buffer.from(parts[0], 'base64');
    const ciphertext = parts[1];
    
    if (iv.length !== IV_LENGTH) {
      throw new Error(`Invalid IV length (expected ${IV_LENGTH} bytes, got ${iv.length})`);
    }
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
