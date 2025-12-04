import { callClaudeJson } from "../lib/call-claude-json";
import { SECURITY_PREFIX, MAX_TOKENS_SHORT } from "./base/constants";

/**
 * Score a text/scene for viral potential
 */
export async function scoreText(
  apiKey: string,
  text: string,
): Promise<{ score: number }> {
  const sanitizedText = text.substring(0, 1000).replaceAll('"', '\\"');

  const prompt = SECURITY_PREFIX + `You are analyzing a video script scene for its viral potential in short-form video content.

Scene Text: "${sanitizedText}"

Rate this scene's engagement and viral potential from 0-100, where:
- 90-100: Extremely engaging - powerful hook, emotional, memorable
- 70-89: High engagement - interesting, clear message, good pacing
- 50-69: Moderate engagement - decent content, room for improvement
- 0-49: Low engagement - weak hook, unclear, needs work

Consider:
- Hook strength (first 2-3 words)
- Clarity and conciseness
- Emotional impact
- Visual appeal
- Shareability

Respond ONLY with JSON format (no markdown, no backticks):
{
  "score": <number 0-100>
}`;

  const result = await callClaudeJson<{ score: number }>(apiKey, prompt, {
    maxTokens: MAX_TOKENS_SHORT
  });

  return {
    score: Math.min(100, Math.max(0, result.score)),
  };
}
