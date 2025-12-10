import type {
  EmotionalAnalysis,
  EmotionalBreakdown,
} from "@shared/advanced-analysis-types";
import { callClaude } from "../base/claude-client";

/**
 * AGENT 3: EMOTIONAL IMPACT ANALYST
 * Analyzes emotional triggers, pain points, and shareability
 */
export async function analyzeEmotionalImpact(
  apiKey: string,
  content: string
): Promise<EmotionalAnalysis> {
  const prompt = `You are an Emotional Impact Specialist analyzing viral content triggers.

Content: "${content}"

Analyze EMOTIONAL TRIGGERS:

1. PRIMARY EMOTION
   - Identify the main emotion triggered (fear, greed, curiosity, anger, joy, FOMO, pride)
   - Rate strength (0-100): weak hint vs powerful trigger
   - Is it authentic or forced?

2. PAIN POINTS
   - Does it touch viewer's real problems?
   - How specific is the pain point?
   - Generic (low score): "жизнь тяжелая"
   - Specific (high score): "не хватает на аренду каждый месяц"

3. ASPIRATION
   - Does it show desirable outcome?
   - Is aspiration credible or fantasy?
   - Can viewer see themselves achieving it?

4. RELATABILITY (0-100)
   - Can target audience see themselves in this?
   - Use of "ты" (direct) vs "я" (personal) vs "они" (distant)?
   - Specific details that resonate?

5. SHAREABILITY TRIGGERS (0-100)
   - Will people want to share this? Why?
   - Identity signaling ("I'm smart/ambitious")
   - Helping friends ("they need to see this")
   - Validation seeking ("agree with this")

Respond ONLY in valid JSON format:
{
  "emotionalScore": <0-100>,
  "breakdown": {
    "primaryEmotion": {
      "type": "fear|greed|curiosity|anger|joy|fomo|pride",
      "strength": <0-100>
    },
    "secondaryEmotion": {
      "type": "<emotion type or null>",
      "strength": <0-100 or 0>
    },
    "painPoints": [
      "<specific pain point in Russian>",
      "<another pain point in Russian>"
    ],
    "relatability": <0-100>,
    "shareabilityScore": <0-100>,
    "triggers": {
      "identified": ["<trigger 1>", "<trigger 2>"],
      "strength": <0-100>
    }
  }
}`;
  console.log(`[AI] agent emotional`);
  const result = await callClaude(apiKey, prompt, { maxTokens: 1536 });

  return {
    emotionalScore: result.emotionalScore,
    breakdown: result.breakdown as EmotionalBreakdown,
  };
}
