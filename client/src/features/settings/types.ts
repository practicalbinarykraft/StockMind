/**
 * Settings Page Types
 */

export interface SafeApiKey {
  id: string;
  userId: string;
  provider: string;
  description: string | null;
  last4: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  // Note: encryptedKey is not included in the safe version
}
