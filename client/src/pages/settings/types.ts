// Safe API Key type (without encryptedKey) - matches backend DTO
export type SafeApiKey = {
  id: string
  provider: string
  last4: string | null  // Nullable for legacy keys created before last4 feature
  description: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type ParseMode = 'latest-20' | 'latest-50' | 'latest-100' | 'new-only'
