import type { CTAAnalysis, CTABreakdown } from "@shared/advanced-analysis-types";
import { callClaude } from "../base/claude-client";

/**
 * AGENT 4: CTA ANALYST
 * Analyzes call-to-action effectiveness and placement
 */
export async function analyzeCTA(
  apiKey: string,
  content: string
): Promise<CTAAnalysis> {
  const prompt = `You are a CTA (Call-to-Action) Specialist for short-form video.

Content: "${content}"

Analyze CALL-TO-ACTION:

1. CTA PRESENCE (0-100)
   - Is there a clear ask?
   - Weak CTAs (low score 20-40):
     • "Подпишись" (generic, overused)
     • "Ставь лайк" (low intent)
   - Strong CTAs (high score 80-95):
     • "Сохрани пост → используй схему завтра утром" (specific action + benefit)
     • "Отправь другу который хочет заработать" (social, specific)

2. CTA PLACEMENT (0-100)
   - Too early (first 3s) = feels pushy (score: 40-50)
   - At natural climax point = perfect (score: 90-100)
   - At the end after value delivered = good (score: 80-90)
   - Missing entirely = score: 0

3. CTA TYPE EFFECTIVENESS
   - "Подписка" = low intent, people forget (score: 30-40)
   - "Сохранить" = high intent, people will return (score: 80-90)
   - "Поделиться с другом" = viral boost potential (score: 70-85)
   - "Комментировать" = engagement boost (score: 65-75)
   - "Перейти по ссылке" = high friction (score: 40-50)

4. FRICTION LEVEL
   - Low friction: "двойной тап", "сохрани", "напиши +" (score: 85-95)
   - Medium friction: "подпишись и включи уведомления" (score: 60-70)
   - High friction: "перейди в профиль → ссылка в шапке → форма" (score: 20-30)

Extract current CTA if present and suggest improvements.

Respond ONLY in valid JSON format:
{
  "ctaScore": <0-100>,
  "breakdown": {
    "presence": {
      "hasCTA": <true|false>,
      "type": "subscribe|save|share|comment|click|custom|null",
      "score": <0-100>
    },
    "placement": {
      "timing": "early|mid|end|missing",
      "isOptimal": <true|false>,
      "score": <0-100>
    },
    "effectiveness": {
      "specificity": <0-100>,
      "frictionLevel": "low|medium|high",
      "score": <0-100>
    },
    "current": "<extracted CTA text or null>",
    "improvements": [
      {
        "suggested": "<improved CTA in Russian>",
        "reasoning": "<why this works better in Russian>",
        "expectedImpact": "<predicted result e.g. '+30% saves'>",
        "priority": "high|medium|low"
      }
    ]
  }
}`;

  const result = await callClaude(apiKey, prompt, { maxTokens: 1536 });

  return {
    ctaScore: result.ctaScore,
    breakdown: result.breakdown as CTABreakdown
  };
}
