/**
 * Multi-provider LLM abstraction
 * Supports Anthropic Claude and DeepSeek
 * Uses API keys from database (BYOK system)
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { db } from '../db';
import { aiSettings } from '../db/schema';
import { decryptApiKey } from './encryption';

// Provider types
export type LLMProvider = 'anthropic' | 'deepseek';

// Response interface
export interface LLMResponse {
  content: string;
  tokensUsed?: number;
}

// Stream callback types
export interface StreamCallbacks {
  onThinking?: (content: string) => void;
  onText?: (content: string) => void;
}

// Provider configuration
interface ProviderConfig {
  model: string;
  maxTokens: number;
}

const PROVIDER_CONFIGS: Record<LLMProvider, ProviderConfig> = {
  anthropic: {
    model: 'claude-sonnet-4-20250514',
    maxTokens: 2048,
  },
  deepseek: {
    model: 'deepseek-chat',
    maxTokens: 2048,
  },
};

// Cache for API keys (short TTL to allow updates)
let cachedSettings: { anthropicKey?: string; deepseekKey?: string; timestamp: number } | null = null;
const CACHE_TTL = 60000; // 1 minute

/**
 * Get API keys from database
 */
async function getApiKeysFromDB(): Promise<{ anthropicKey?: string; deepseekKey?: string }> {
  // Check cache
  if (cachedSettings && Date.now() - cachedSettings.timestamp < CACHE_TTL) {
    return {
      anthropicKey: cachedSettings.anthropicKey,
      deepseekKey: cachedSettings.deepseekKey,
    };
  }

  try {
    const [settings] = await db.select().from(aiSettings).limit(1);

    if (!settings) {
      cachedSettings = { timestamp: Date.now() };
      return {};
    }

    const anthropicKey = settings.anthropicApiKey ? decryptApiKey(settings.anthropicApiKey) : undefined;
    const deepseekKey = settings.deepseekApiKey ? decryptApiKey(settings.deepseekApiKey) : undefined;

    cachedSettings = {
      anthropicKey,
      deepseekKey,
      timestamp: Date.now(),
    };

    return { anthropicKey, deepseekKey };
  } catch (error) {
    console.error('[LLM Provider] Ошибка получения API ключей из БД:', error);
    return {};
  }
}

/**
 * Clear API keys cache (call when keys are updated)
 */
export function clearApiKeysCache(): void {
  cachedSettings = null;
}

/**
 * Create Anthropic client with given API key
 */
function createAnthropicClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}

/**
 * Create DeepSeek client with given API key
 */
function createDeepSeekClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: 'https://api.deepseek.com/v1',
  });
}

/**
 * Call LLM with streaming support
 * Gets API key from database automatically
 */
export async function callLLM(
  provider: LLMProvider,
  systemPrompt: string,
  userPrompt: string,
  callbacks?: StreamCallbacks,
  maxTokens?: number
): Promise<LLMResponse> {
  const config = PROVIDER_CONFIGS[provider];
  const tokens = maxTokens || config.maxTokens;

  // Get API key from database
  const keys = await getApiKeysFromDB();
  const apiKey = provider === 'anthropic' ? keys.anthropicKey : keys.deepseekKey;

  if (!apiKey) {
    throw new Error(`API ключ ${provider} не настроен. Добавьте ключ в настройках.`);
  }

  if (provider === 'anthropic') {
    return callAnthropicWithKey(apiKey, systemPrompt, userPrompt, callbacks, tokens);
  } else {
    return callDeepSeekWithKey(apiKey, systemPrompt, userPrompt, callbacks, tokens);
  }
}

/**
 * Call Anthropic Claude API with streaming and thinking
 */
async function callAnthropicWithKey(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  callbacks?: StreamCallbacks,
  maxTokens: number = 2048
): Promise<LLMResponse> {
  const client = createAnthropicClient(apiKey);

  const stream = await client.messages.create({
    model: PROVIDER_CONFIGS.anthropic.model,
    max_tokens: maxTokens,
    stream: true,
    thinking: { type: 'enabled', budget_tokens: 1024 },
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  let fullResponse = '';
  let totalTokens = 0;

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta') {
      const delta = chunk.delta;

      // Handle thinking events
      if ('thinking' in delta && typeof delta.thinking === 'string') {
        if (callbacks?.onThinking) {
          callbacks.onThinking(delta.thinking);
        }
      }

      // Handle text content
      if ('text' in delta && typeof delta.text === 'string') {
        fullResponse += delta.text;
        if (callbacks?.onText) {
          callbacks.onText(delta.text);
        }
      }
    }

    // Get usage info
    if (chunk.type === 'message_delta' && 'usage' in chunk) {
      totalTokens = (chunk.usage as any)?.output_tokens || 0;
    }
  }

  return {
    content: fullResponse,
    tokensUsed: totalTokens,
  };
}

/**
 * Call DeepSeek API with streaming
 * DeepSeek uses OpenAI-compatible API format
 */
async function callDeepSeekWithKey(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  callbacks?: StreamCallbacks,
  maxTokens: number = 2048
): Promise<LLMResponse> {
  const client = createDeepSeekClient(apiKey);

  const stream = await client.chat.completions.create({
    model: PROVIDER_CONFIGS.deepseek.model,
    max_tokens: maxTokens,
    stream: true,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  let fullResponse = '';
  let totalTokens = 0;

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullResponse += content;
      if (callbacks?.onText) {
        callbacks.onText(content);
      }
    }

    // Get usage info (usually in the last chunk)
    if (chunk.usage) {
      totalTokens = chunk.usage.completion_tokens || 0;
    }
  }

  return {
    content: fullResponse,
    tokensUsed: totalTokens,
  };
}

/**
 * Simple non-streaming call for quick operations
 */
export async function callLLMSimple(
  provider: LLMProvider,
  systemPrompt: string,
  userPrompt: string,
  maxTokens?: number
): Promise<string> {
  const response = await callLLM(provider, systemPrompt, userPrompt, undefined, maxTokens);
  return response.content;
}

/**
 * Check if a provider is available (API key configured in DB)
 */
export async function isProviderAvailable(provider: LLMProvider): Promise<boolean> {
  const keys = await getApiKeysFromDB();
  if (provider === 'anthropic') {
    return !!keys.anthropicKey;
  } else if (provider === 'deepseek') {
    return !!keys.deepseekKey;
  }
  return false;
}

/**
 * Get list of available providers (sync version for routes)
 * Note: Returns empty array if cache is not populated
 */
export function getAvailableProviders(): LLMProvider[] {
  const providers: LLMProvider[] = [];
  if (cachedSettings?.anthropicKey) providers.push('anthropic');
  if (cachedSettings?.deepseekKey) providers.push('deepseek');
  return providers;
}

/**
 * Test provider API key
 */
export async function testProvider(
  provider: LLMProvider,
  apiKey: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (provider === 'anthropic') {
      const client = createAnthropicClient(apiKey);
      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 50,
        messages: [
          {
            role: 'user',
            content: 'Say "API key is working!" in Russian, one sentence only.',
          },
        ],
      });

      const textContent = message.content.find((c) => c.type === 'text');
      return {
        success: true,
        message: (textContent as any)?.text || 'Anthropic API ключ работает!',
      };
    } else if (provider === 'deepseek') {
      const client = createDeepSeekClient(apiKey);
      const completion = await client.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: 'Say "API key is working!" in Russian, one sentence only.',
          },
        ],
        max_tokens: 50,
      });

      return {
        success: true,
        message: completion.choices[0]?.message?.content || 'DeepSeek API ключ работает!',
      };
    }

    return {
      success: false,
      message: 'Неизвестный провайдер',
    };
  } catch (error: any) {
    console.error(`[LLM Provider] Ошибка тестирования ${provider}:`, error);
    return {
      success: false,
      message: error.message || 'Ошибка при тестировании API ключа',
    };
  }
}
