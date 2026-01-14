import { testApiKeyByProvider } from "server/lib/api-key-tester";
import { decryptApiKey, encryptApiKey } from "../../storage/base/encryption";
import { CreateApiKeyDto } from "./api-keys.dto";
import { ApiKeysRepo } from "./api-keys.repo";
import { ApiKeyNotFoundError } from "./api-keys.errors";


const apiKeysRepo = new ApiKeysRepo();

export const apiKeysService = {
  async create(dto: CreateApiKeyDto, userId: string) {
    const { key, ...rest } = dto;
    const trimmedKey = key.trim(); // Remove whitespace

    // Extract last 4 characters for display (before encryption)
    const last4 = trimmedKey.length >= 4 ? trimmedKey.slice(-4) : trimmedKey;
    const encryptedKey = encryptApiKey(trimmedKey);

    const apiKey = await apiKeysRepo.create(rest, userId, encryptedKey, last4);

    const safeApiKey = {
        id: apiKey.id,
        provider: apiKey.provider,
        last4: apiKey.last4 || null,
        description: apiKey.description,
        isActive: apiKey.isActive,
        createdAt: apiKey.createdAt,
        updatedAt: apiKey.updatedAt,
    };

    return safeApiKey;
  },

  async getApiKeys(userId: string) {
    const apiKeys = await apiKeysRepo.getAllByUserId(userId);

    const safeApiKeys = apiKeys.map(key => ({
      id: key.id,
      provider: key.provider,
      last4: key.last4 || null, // null for legacy keys without last4
      description: key.description,
      isActive: key.isActive,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
    }));

    return safeApiKeys;
  },

  async deleteApiKey(id: string, userId: string) {
    const apiKey = await apiKeysRepo.delete(id, userId);
    return apiKey;
  },

  async testApiKey(id: string, userId: string) {
    const apiKey = await apiKeysRepo.getById(id, userId)
    if (!apiKey) {
      throw new ApiKeyNotFoundError();
    }    

    // Get decrypted key from the dedicated field
    const decryptedKey = decryptApiKey(apiKey.encryptedKey)

    // Test using centralized utility
    const result = await testApiKeyByProvider(apiKey.provider, decryptedKey);

    return result;
  }
};
