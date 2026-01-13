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
  createApiKey(userId: string, data: Omit<InsertApiKey, 'userId' | 'encryptedKey'> & { key: string }): Promise<ApiKey>;
  deleteApiKey(id: string, userId: string): Promise<void>;
  getUserApiKey(userId: string, provider: string): Promise<ApiKeyWithDecrypted | undefined>;
  getApiKeyById(id: string, userId: string): Promise<ApiKeyWithDecrypted | undefined>;
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
   * Create a new API key
   * Encrypts the key before storage and extracts last 4 characters for display
   */
  async createApiKey(
    userId: string,
    data: Omit<InsertApiKey, 'userId' | 'encryptedKey'> & { key: string }
  ): Promise<ApiKey> {
    const { key, ...rest } = data;
    const trimmedKey = key.trim(); // Remove whitespace

    // Extract last 4 characters for display (before encryption)
    const last4 = trimmedKey.length >= 4 ? trimmedKey.slice(-4) : trimmedKey;

    console.log(`[ApiKeysStorage] Creating API key for userId: ${userId}, provider: ${rest.provider}, isActive: ${rest.isActive ?? true}, last4: ...${last4}`);

    const [apiKey] = await db
      .insert(apiKeys)
      .values({
        ...rest,
        userId,
        encryptedKey: encryptApiKey(trimmedKey),
        last4,
      })
      .returning();

    console.log(`[ApiKeysStorage] Created API key: id=${apiKey.id}, provider=${apiKey.provider}, isActive=${apiKey.isActive}`);
    return apiKey;
  } // done

  /**
   * Delete an API key
   */
  async deleteApiKey(id: string, userId: string): Promise<void> {
    console.log(`[ApiKeysStorage] Deleting API key: id=${id}, userId=${userId}`);

    const result = await db
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
      .returning();

    if (result.length > 0) {
      console.log(`[ApiKeysStorage] Successfully deleted API key: id=${result[0].id}, provider=${result[0].provider}`);
    } else {
      console.log(`[ApiKeysStorage] WARNING: No API key deleted for id=${id}, userId=${userId} - key not found or userId mismatch`);
    }
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
  } // to do in repo

  /**
   * Get API key by ID
   * Returns the key with decrypted value in separate field
   */
  async getApiKeyById(id: string, userId: string): Promise<ApiKeyWithDecrypted | undefined> {
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
      .limit(1);

    if (key) {
      // Return with encryptedKey unchanged and decryptedKey in separate field
      return {
        ...key,
        encryptedKey: key.encryptedKey, // remains encrypted
        decryptedKey: decryptApiKey(key.encryptedKey), // decrypted value
      };
    }

    return undefined;
  } // done
}

export const apiKeysStorage = new ApiKeysStorage();
