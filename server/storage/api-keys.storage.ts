// API Keys storage operations
import { db } from "../db";
import { apiKeys, type ApiKey, type InsertApiKey, type ApiKeyWithDecrypted } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { encryptApiKey, decryptApiKey } from "./base/encryption";

/**
 * API Keys storage interface
 */
export interface IApiKeysStorage {
  getApiKeys(userId: string): Promise<ApiKey[]>;
  getUserApiKey(userId: string, provider: string): Promise<ApiKeyWithDecrypted | undefined>;
  // Removed: createApiKey, deleteApiKey, getApiKeyById - use modules/api-keys/api-keys.repo.ts
}

/**
 * API Keys storage implementation
 * Handles encrypted storage of API keys for various providers
 */
export class ApiKeysStorage implements IApiKeysStorage {
  /**
   * Get all API keys for a user
   */
  async getApiKeys(userId: string): Promise<ApiKey[]> {
    return await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .orderBy(desc(apiKeys.createdAt));
  } // done

  /**
   * Get active API key for a user and provider
   * Returns the key with decrypted value in separate field
   */
  async getUserApiKey(userId: string, provider: string): Promise<ApiKeyWithDecrypted | undefined> {
    console.log(`[ApiKeysStorage] Getting API key for userId: ${userId}, provider: ${provider}`);

    const [key] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, provider), eq(apiKeys.isActive, true)))
      .orderBy(desc(apiKeys.updatedAt))
      .limit(1);

    if (key) {
      console.log(`[ApiKeysStorage] Found API key: id=${key.id}, isActive=${key.isActive}, provider=${key.provider} (key length: ${key.encryptedKey.length} chars encrypted)`);
      // Return with encryptedKey unchanged and decryptedKey in separate field
      return {
        ...key,
        encryptedKey: key.encryptedKey, // remains encrypted
        decryptedKey: decryptApiKey(key.encryptedKey), // decrypted value
      };
    }

    console.log(`[ApiKeysStorage] No API key found for userId: ${userId}, provider: ${provider}`);
    return undefined;
  } // done
}

export const apiKeysStorage = new ApiKeysStorage();
