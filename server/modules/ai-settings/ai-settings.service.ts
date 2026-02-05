import { apiKeysService } from "../api-keys/api-keys.service";

/**
 * AI Settings Service
 * Temporary service for AI generation settings
 * TODO: Store settings in database
 */
export const aiSettingsService = {
  /**
   * Get AI settings for script generation
   */
  async getSettings(userId: string) {
    // Get API keys info
    const apiKeys = await apiKeysService.getApiKeys(userId);
    
    const anthropicKey = apiKeys.find(k => k.provider === 'anthropic');
    const deepseekKey = apiKeys.find(k => k.provider === 'deepseek');
    
    // Return default settings with API keys info
    return {
      provider: anthropicKey ? 'anthropic' : deepseekKey ? 'deepseek' : 'anthropic',
      anthropicApiKeyLast4: anthropicKey?.last4 || null,
      deepseekApiKeyLast4: deepseekKey?.last4 || null,
      hasAnthropicKey: !!anthropicKey,
      hasDeepseekKey: !!deepseekKey,
      scriptwriterPrompt: '',
      editorPrompt: '',
      maxIterations: 3,
      autoSendToHumanReview: false,
      examples: [],
    };
  },

  /**
   * Update AI settings
   * TODO: Store in database
   */
  async updateSettings(userId: string, settings: any) {
    // For now, just return the settings back
    // TODO: Store in database
    const currentSettings = await this.getSettings(userId);
    
    return {
      ...currentSettings,
      ...settings,
    };
  },
};
