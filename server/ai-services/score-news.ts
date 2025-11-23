import { callClaudeJson } from "../lib/call-claude-json";
import { SECURITY_PREFIX, MAX_TOKENS_SHORT } from "./base/constants";
import type { NewsScoreResult } from "./base/types";

/**
 * Score a news article for viral potential in short-form video content
 */
export async function scoreNewsItem(
  apiKey: string,
  title: string,
  content: string,
): Promise<NewsScoreResult> {
  const sanitizedTitle = title.replaceAll('"', '\\"');
  const sanitizedContent = content.substring(0, 3000).replaceAll('"', '\\"');

  const prompt = SECURITY_PREFIX + `You are analyzing a news article for its potential virality in short-form video content (like TikTok, Instagram Reels, YouTube Shorts).

Article Title: "${sanitizedTitle}"
Content: "${sanitizedContent}"

Rate this article's virality potential from 0-100, where:
- 90-100: Extremely viral - shocking, emotional, trending topics
- 70-89: High potential - interesting, shareable, relevant
- 50-69: Moderate potential - decent content, niche appeal
- 0-49: Low potential - boring, technical, limited appeal

Respond in JSON format:
{
  "score": <number 0-100>,
  "comment": "<brief 1-sentence explanation in Russian>"
}`;

  const result = await callClaudeJson<NewsScoreResult>(apiKey, prompt, {
    maxTokens: MAX_TOKENS_SHORT
  });

  return {
    score: Math.min(100, Math.max(0, result.score)),
    comment: result.comment || "Оценка контента",
  };
}
