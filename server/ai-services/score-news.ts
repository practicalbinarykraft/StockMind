import { callClaudeJson } from "../lib/call-claude-json";
import { SECURITY_PREFIX, MAX_TOKENS_SHORT } from "./base/constants";
import type { NewsScoreResult } from "./base/types";

/**
 * Quick score a news article for viral potential (Level 1)
 * 
 * Fast evaluation for filtering articles during RSS parsing.
 * Uses specific criteria with weights:
 * - Specific facts/numbers: 0-35 points
 * - Relevance/trending: 0-25 points
 * - Broad audience: 0-20 points
 * - Topic interest: 0-20 points
 */
export async function scoreNewsItem(
  apiKey: string,
  title: string,
  content: string,
): Promise<NewsScoreResult> {
  const sanitizedTitle = title.replaceAll('"', '\\"').replaceAll('\n', ' ');
  const sanitizedContent = content.substring(0, 3000).replaceAll('"', '\\"').replaceAll('\n', ' ');

  const prompt = SECURITY_PREFIX + `You are quickly evaluating a news article for its potential to become a viral short-form video (TikTok, Instagram Reels, YouTube Shorts).

Article Title: "${sanitizedTitle}"
Content: "${sanitizedContent}"

Evaluate using these 4 criteria with weights:

1. SPECIFIC FACTS/NUMBERS (0-35 points)
   - Are there specific numbers, dates, amounts, percentages?
   - Example: "iPhone costs $999" → 30 points
   - Example: "New product released" → 5 points (too generic)
   - Higher score = more specific facts

2. RELEVANCE/TRENDING (0-25 points)
   - Is the topic currently trending or highly relevant?
   - Is it breaking news or hot topic?
   - Will people care about this NOW?
   - Higher score = more relevant/trending

3. BROAD AUDIENCE (0-20 points)
   - Will this interest a wide audience or just niche?
   - Tech news → tech audience (15-20)
   - Celebrity news → broad audience (18-20)
   - Niche technical topic → limited audience (5-10)
   - Higher score = broader appeal

4. TOPIC INTEREST (0-20 points)
   - Is the topic inherently interesting?
   - Shocking, surprising, or emotionally engaging?
   - Higher score = more interesting

Calculate total score (0-100) and provide 2-3 specific reasons in Russian.

Respond in JSON format:
{
  "score": <number 0-100>,
  "comment": "<2-3 specific reasons in Russian, format: 'Интересно потому что: 1. [reason], 2. [reason], 3. [reason]'>"
}`;

  const result = await callClaudeJson<NewsScoreResult>(apiKey, prompt, {
    maxTokens: MAX_TOKENS_SHORT
  });

  return {
    score: Math.min(100, Math.max(0, result.score)),
    comment: result.comment || "Оценка контента",
  };
}
