/**
 * API Key Testing Utilities
 * Centralized logic for testing external API keys
 */

import { testApifyApiKey } from '../apify-service';

export interface ApiKeyTestResult {
  success: boolean;
  message: string;
  provider: string;
}

/**
 * Test API key for a specific provider
 * @param provider - The API provider (anthropic, openai, apify, elevenlabs, heygen, kieai)
 * @param apiKey - The decrypted API key to test
 * @returns Test result with success status and message
 */
export async function testApiKeyByProvider(
  provider: string,
  apiKey: string
): Promise<ApiKeyTestResult> {
  try {
    switch (provider) {
      case 'anthropic': {
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const anthropic = new Anthropic({ apiKey });
        
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 50,
          messages: [{ 
            role: 'user', 
            content: 'Say "API key is working!" in one sentence.' 
          }],
        });
        
        const textContent = message.content.find((c: any) => c.type === 'text');
        return { 
          success: true, 
          message: (textContent as any)?.text || 'Anthropic API key is valid',
          provider 
        };
      }
      
      case 'openai': {
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ apiKey });
        
        // Test with simple completion
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Say "Hello" in Russian' }],
          max_tokens: 10,
        });
        
        return {
          success: true,
          message: completion.choices[0]?.message?.content || 'OpenAI API key is valid',
          provider
        };
      }
      
      case 'apify': {
        const result = await testApifyApiKey(apiKey);
        if (result.success) {
          return {
            success: true,
            message: `Apify API key is valid. Quota: $${result.usage?.availableCredits?.toFixed(2) || 'unknown'}`,
            provider
          };
        } else {
          return {
            success: false,
            message: result.error || 'Apify API key is invalid',
            provider
          };
        }
      }
      
      case 'elevenlabs': {
        const response = await fetch('https://api.elevenlabs.io/v1/user', {
          headers: {
            'xi-api-key': apiKey,
          },
        });
        
        if (!response.ok) {
          throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return {
          success: true,
          message: `ElevenLabs API key is valid. Quota: ${data.subscription?.character_count || 0}/${data.subscription?.character_limit || 0} chars`,
          provider
        };
      }
      
      case 'heygen': {
        const response = await fetch('https://api.heygen.com/v1/user.info', {
          headers: {
            'X-Api-Key': apiKey,
          },
        });
        
        if (!response.ok) {
          throw new Error(`HeyGen API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return {
          success: true,
          message: data.data?.user?.email 
            ? `HeyGen API key is valid. Account: ${data.data.user.email}` 
            : 'HeyGen API key is valid',
          provider
        };
      }
      
      case 'kieai': {
        // Test Kie.ai API - check quota
        const response = await fetch('https://api.kie.ai/v1/quota', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });
        
        if (!response.ok) {
          throw new Error(`Kie.ai API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return {
          success: true,
          message: data.remaining !== undefined 
            ? `Kie.ai API key is valid. Remaining credits: ${data.remaining}` 
            : 'Kie.ai API key is valid',
          provider
        };
      }
      
      default:
        return {
          success: false,
          message: `Unknown provider: ${provider}`,
          provider
        };
    }
  } catch (error: any) {
    console.error(`Error testing ${provider} API key:`, error);
    
    // Handle specific error cases
    if (error.message?.includes('invalid') || error.message?.includes('authentication')) {
      return { 
        success: false, 
        message: "API key is invalid or expired",
        provider
      };
    }
    
    return { 
      success: false, 
      message: error.message || "Failed to test API key",
      provider
    };
  }
}
