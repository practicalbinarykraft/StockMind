import { callClaudeJson } from "../lib/call-claude-json";
import { SECURITY_PREFIX, MAX_TOKENS_MED } from "./base/constants";
import type { ReelScoreResult } from "./base/types";

/**
 * Score Instagram Reel for viral potential based on transcription and caption
 * Analyzes content quality, engagement potential, and virality
 */
export async function scoreInstagramReel(
  apiKey: string,
  transcription: string,
  caption: string | null,
  engagementMetrics?: {
    likes: number;
    comments: number;
    views: number | null;
  }
): Promise<ReelScoreResult> {
  const sanitizedTranscription = transcription
    .substring(0, 3000)
    .replaceAll('"', '\\"');
  const sanitizedCaption = caption ? caption.replaceAll('"', '\\"') : null;

  const captionText = sanitizedCaption
    ? `\nCaption: "${sanitizedCaption}"`
    : "";
  // Fix views=0 issue - check for null/undefined explicitly
  const hasViews =
    engagementMetrics?.views !== null && engagementMetrics?.views !== undefined;
  const metricsText = engagementMetrics
    ? `\nEngagement: ${engagementMetrics.likes} likes, ${
        engagementMetrics.comments
      } comments${hasViews ? `, ${engagementMetrics.views} views` : ""}`
    : "";

  const prompt =
    SECURITY_PREFIX +
    `You are analyzing an Instagram Reel for its viral potential and content quality.

Video Transcription (speech-to-text): "${sanitizedTranscription}"${captionText}${metricsText}

Analyze this Reel across three dimensions (each 0-100):
1. FRESHNESS - Is the content trendy, timely, relevant to current interests?
2. VIRALITY - Does it have emotional hooks, shareability, broad appeal?
3. QUALITY - Is the message clear, valuable, well-structured?

Then calculate an OVERALL SCORE (0-100) that represents the Reel's potential for repurposing into new content.

Scoring guide:
- 90-100: Outstanding - perfect for repurposing, highly engaging
- 70-89: Strong potential - good content, worth using
- 50-69: Moderate - acceptable, but needs work
- 0-49: Weak - skip or heavily modify

Respond in JSON format:
{
  "score": <overall score 0-100>,
  "comment": "<1-2 sentence explanation in Russian>",
  "freshnessScore": <0-100>,
  "viralityScore": <0-100>,
  "qualityScore": <0-100>
}`;

  console.log(`[AI] score reel`);
  const result = await callClaudeJson<ReelScoreResult>(apiKey, prompt, {
    maxTokens: MAX_TOKENS_MED,
  });

  return {
    score: Math.min(100, Math.max(0, result.score)),
    comment: result.comment || "Оценка контента Reels",
    freshnessScore:
      typeof result.freshnessScore === "number"
        ? Math.min(100, Math.max(0, result.freshnessScore))
        : undefined,
    viralityScore:
      typeof result.viralityScore === "number"
        ? Math.min(100, Math.max(0, result.viralityScore))
        : undefined,
    qualityScore:
      typeof result.qualityScore === "number"
        ? Math.min(100, Math.max(0, result.qualityScore))
        : undefined,
  };
}
