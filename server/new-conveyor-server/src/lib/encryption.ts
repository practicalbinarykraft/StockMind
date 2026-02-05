/**
 * Шифрование API ключей
 * Использует AES-256-CBC с уникальным IV для каждого ключа
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Ключ шифрования из переменной окружения или дефолтный (для разработки)
const getEncryptionKey = (): string => {
  const secret = process.env.ENCRYPTION_SECRET || process.env.SESSION_SECRET || 'content-factory-default-key-32ch';
  return secret.slice(0, 32).padEnd(32, '0');
};

const ALGORITHM = 'aes-256-cbc';

/**
 * Зашифровать API ключ
 * @param key - открытый ключ
 * @returns зашифрованная строка (iv:encrypted)
 */
export function encryptApiKey(key: string): string {
  if (!key) return '';

  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(getEncryptionKey()), iv);
  let encrypted = cipher.update(key, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Расшифровать API ключ
 * @param encryptedKey - зашифрованная строка (iv:encrypted)
 * @returns расшифрованный ключ
 */
export function decryptApiKey(encryptedKey: string): string {
  if (!encryptedKey || !encryptedKey.includes(':')) return '';

  try {
    const parts = encryptedKey.split(':');
    if (parts.length !== 2) return '';

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = createDecipheriv(ALGORITHM, Buffer.from(getEncryptionKey()), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('[Encryption] Ошибка расшифровки:', error);
    return '';
  }
}

/**
 * Получить последние 4 символа ключа (для отображения)
 * @param key - открытый ключ
 * @returns последние 4 символа или пустая строка
 */
export function getLast4(key: string): string {
  if (!key || key.length < 4) return '';
  return key.slice(-4);
}
