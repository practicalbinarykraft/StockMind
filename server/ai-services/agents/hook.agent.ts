import type { HookAnalysis, HookBreakdown } from "@shared/advanced-analysis-types";
import { callClaude } from "../base/claude-client";
import { extractOpening } from "../base/helpers";

/**
 * AGENT 1: HOOK EXPERT
 * Analyzes the first 3-5 seconds of content for attention-grabbing potential
 */
export async function analyzeHook(
  apiKey: string,
  content: string
): Promise<HookAnalysis> {
  const opening = extractOpening(content, 300);

  const prompt = `You are a Hook Expert analyzing the first 3-5 seconds of short-form video content (Instagram Reels, TikTok, YouTube Shorts).

Content opening: "${opening}"

Analyze the HOOK across these 5 criteria (each scored 0-100):

1. ATTENTION GRAB (0-100)
   - Does it stop the scroll immediately?
   - Is there shock value / curiosity gap / unexpected element?
   - Visual or verbal hook strength?

2. CLARITY (0-100)
   - Is the promise/topic instantly clear?
   - Can viewer understand value in 1 second?
   - No confusion about what this is about?

3. SPECIFICITY (0-100)
   - Are there specific numbers/facts/names?
   - Generic examples (low score):
     • "Как заработать деньги" (score: 20-30)
     • "Секрет успеха" (score: 25)
   - Specific examples (high score):
     • "Как я заработал $10,247 за 18 дней" (score: 90-95)
     • "3 ошибки которые стоили мне $50,000" (score: 85-90)

4. EMOTIONAL TRIGGER (0-100)
   - Does it trigger fear, greed, curiosity, anger, FOMO?
   - How strong is the emotional response?
   - Will viewer FEEL something immediately?

5. PATTERN MATCH (0-100)
   - Does it match proven viral hook patterns?
   - Known patterns: question, shocking-stat, problem-statement, curiosity-gap, personal-story

Also identify the hook TYPE and provide 2-3 IMPROVED variants.

Respond ONLY in valid JSON format:
{
  "score": <average of 5 criteria, 0-100>,
  "type": "question|stat|problem|curiosity|story|command",
  "criteria": {
    "attentionGrab": {
      "score": <0-100>,
      "reason": "<why this score in Russian>",
      "improvement": "<how to improve in Russian or omit>"
    },
    "clarity": {
      "score": <0-100>,
      "reason": "<why this score in Russian>",
      "improvement": "<how to improve in Russian or omit>"
    },
    "specificity": {
      "score": <0-100>,
      "reason": "<why this score in Russian>",
      "improvement": "<how to improve in Russian>"
    },
    "emotional": {
      "score": <0-100>,
      "reason": "<why this score in Russian>",
      "improvement": "<how to improve in Russian or omit>"
    },
    "patternMatch": {
      "score": <0-100>,
      "reason": "<which patterns matched in Russian>",
      "improvement": "<how to improve in Russian or omit>"
    }
  },
  "currentHook": "<extract the actual hook text>",
  "improvements": [
    {
      "variant": "<improved hook variant in Russian>",
      "changes": ["<change 1>", "<change 2>"],
      "expectedScore": <predicted score 0-100>,
      "reasoning": "<why this would work better in Russian>",
      "priority": "high|medium|low"
    }
  ]
}`;

  const result = await callClaude(apiKey, prompt, { maxTokens: 2048 });

  return {
    hookScore: result.score,
    hookType: result.type,
    breakdown: {
      score: result.score,
      type: result.type,
      criteria: result.criteria,
      currentHook: result.currentHook,
      improvements: result.improvements
    } as HookBreakdown
  };
}
