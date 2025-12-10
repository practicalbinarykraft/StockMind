import { callClaudeJson } from "../lib/call-claude-json";
import { SECURITY_PREFIX, MAX_TOKENS_MED } from "./base/constants";
import type { ArticlePotentialResult } from "@shared/article-potential-types";

/**
 * Analyze article's potential to become a video script (Level 2)
 *
 * This analyzes the ARTICLE itself, not a script!
 * It evaluates:
 * - Can we create a hook from this article?
 * - Is there enough material for 15-20 sec video?
 * - What emotional angle can we use?
 * - What visuals can we show?
 * - What format would work best?
 *
 * DOES NOT analyze:
 * - Hook quality (hook doesn't exist yet!)
 * - CTA (CTA doesn't exist yet!)
 * - Speech pacing (this is not a video yet!)
 * - Scene structure (scenes don't exist yet!)
 */
export async function analyzeArticlePotential(
  apiKey: string,
  title: string,
  content: string
): Promise<ArticlePotentialResult> {
  const sanitizedTitle = title.replaceAll('"', '\\"').replaceAll("\n", " ");
  const sanitizedContent = content
    .substring(0, 8000)
    .replaceAll('"', '\\"')
    .replaceAll("\n", " ");

  const prompt =
    SECURITY_PREFIX +
    `You are analyzing a NEWS ARTICLE to determine if it can become a good short-form video (15-20 seconds for Instagram Reels, TikTok, YouTube Shorts).

IMPORTANT: You are analyzing the ARTICLE itself, NOT a video script. The script doesn't exist yet!

Article Title: "${sanitizedTitle}"
Article Content: "${sanitizedContent}"

Your task: Evaluate the POTENTIAL of this article to become a video script.

Analyze across these 5 criteria:

1. HOOK POTENTIAL (0-100)
   - Can we create an attention-grabbing hook from the title or key facts?
   - Does the title/first sentence have specific numbers, shocking facts, or curiosity gaps?
   - Example: "iPhone works 2 days" → Good hook potential (specific, surprising)
   - Example: "New product released" → Weak hook potential (generic)
   - Provide a suggested hook if possible

2. CONTENT SUFFICIENCY (0-100)
   - Is there enough material for a 15-20 second video?
   - How many key facts/points are there? (need at least 2-3)
   - Is the content dense enough or too sparse?
   - Can we extract 3-5 key points for the video body?

3. EMOTIONAL ANGLE (0-100)
   - What emotions can we trigger? (FOMO, curiosity, shock, anger, joy, fear, greed)
   - How strong is the emotional potential?
   - Is there conflict, drama, or controversy?
   - Will people want to share this emotionally?

4. VISUAL POTENTIAL (0-100)
   - What can we show visually?
   - Are there products, comparisons, before/after, charts, people?
   - Can we create engaging visuals from this content?
   - List 2-3 suggested visuals

5. FORMAT RECOMMENDATION
   - What video format would work best?
   - Options: news_update, explainer, story, comparison, tutorial, trend
   - Why this format?

Respond in JSON format:
{
  "score": <number 0-100>,
  "verdict": "excellent|good|moderate|weak",
  "confidence": <number 0-1>,
  "breakdown": {
    "hookPotential": {
      "score": <0-100>,
      "hasHookMaterial": <boolean>,
      "suggestedHook": "<suggested hook text in Russian or null>",
      "reasoning": "<why in Russian>"
    },
    "contentSufficiency": {
      "score": <0-100>,
      "hasEnoughFacts": <boolean>,
      "factCount": <number>,
      "reasoning": "<why in Russian>"
    },
    "emotionalAngle": {
      "score": <0-100>,
      "primaryEmotion": "fomo|curiosity|shock|anger|joy|fear|greed|neutral",
      "strength": <0-100>,
      "reasoning": "<why in Russian>"
    },
    "visualPotential": {
      "score": <0-100>,
      "hasVisualElements": <boolean>,
      "suggestedVisuals": ["<visual 1>", "<visual 2>", "<visual 3>"],
      "reasoning": "<why in Russian>"
    },
    "recommendedFormat": {
      "format": "news_update|explainer|story|comparison|tutorial|trend",
      "confidence": <0-100>,
      "reasoning": "<why in Russian>"
    }
  },
  "strengths": [
    "<strength 1 in Russian>",
    "<strength 2 in Russian>",
    "<strength 3 in Russian>"
  ],
  "weaknesses": [
    "<weakness 1 in Russian>",
    "<weakness 2 in Russian>"
  ],
  "videoScorePrediction": {
    "ifWellAdapted": "<e.g. '75-80/100'>",
    "ifPoorlyAdapted": "<e.g. '60-65/100'>",
    "reasoning": "<why in Russian>"
  },
  "adaptationDifficulty": "easy|medium|hard",
  "scriptRecommendations": [
    "<recommendation 1 in Russian>",
    "<recommendation 2 in Russian>",
    "<recommendation 3 in Russian>"
  ]
}`;

  console.log(`[AI] analyze article`);

  const result = await callClaudeJson<ArticlePotentialResult>(apiKey, prompt, {
    maxTokens: MAX_TOKENS_MED,
  });

  // Validate and normalize
  return {
    score: Math.min(100, Math.max(0, result.score || 0)),
    verdict: result.verdict || "moderate",
    confidence: Math.min(1, Math.max(0, result.confidence || 0.5)),
    breakdown: {
      hookPotential: {
        score: Math.min(
          100,
          Math.max(0, result.breakdown?.hookPotential?.score || 0)
        ),
        hasHookMaterial:
          result.breakdown?.hookPotential?.hasHookMaterial || false,
        suggestedHook: result.breakdown?.hookPotential?.suggestedHook,
        reasoning:
          result.breakdown?.hookPotential?.reasoning ||
          "Не удалось оценить потенциал хука",
      },
      contentSufficiency: {
        score: Math.min(
          100,
          Math.max(0, result.breakdown?.contentSufficiency?.score || 0)
        ),
        hasEnoughFacts:
          result.breakdown?.contentSufficiency?.hasEnoughFacts || false,
        factCount: result.breakdown?.contentSufficiency?.factCount || 0,
        reasoning:
          result.breakdown?.contentSufficiency?.reasoning ||
          "Не удалось оценить достаточность контента",
      },
      emotionalAngle: {
        score: Math.min(
          100,
          Math.max(0, result.breakdown?.emotionalAngle?.score || 0)
        ),
        primaryEmotion:
          result.breakdown?.emotionalAngle?.primaryEmotion || "neutral",
        strength: Math.min(
          100,
          Math.max(0, result.breakdown?.emotionalAngle?.strength || 0)
        ),
        reasoning:
          result.breakdown?.emotionalAngle?.reasoning ||
          "Не удалось определить эмоциональный угол",
      },
      visualPotential: {
        score: Math.min(
          100,
          Math.max(0, result.breakdown?.visualPotential?.score || 0)
        ),
        hasVisualElements:
          result.breakdown?.visualPotential?.hasVisualElements || false,
        suggestedVisuals:
          result.breakdown?.visualPotential?.suggestedVisuals || [],
        reasoning:
          result.breakdown?.visualPotential?.reasoning ||
          "Не удалось оценить визуальный потенциал",
      },
      recommendedFormat: {
        format: result.breakdown?.recommendedFormat?.format || "news_update",
        confidence: Math.min(
          100,
          Math.max(0, result.breakdown?.recommendedFormat?.confidence || 0)
        ),
        reasoning:
          result.breakdown?.recommendedFormat?.reasoning ||
          "Рекомендуется формат News Update",
      },
    },
    strengths: result.strengths || [],
    weaknesses: result.weaknesses || [],
    videoScorePrediction: {
      ifWellAdapted: result.videoScorePrediction?.ifWellAdapted || "70-75/100",
      ifPoorlyAdapted:
        result.videoScorePrediction?.ifPoorlyAdapted || "50-60/100",
      reasoning:
        result.videoScorePrediction?.reasoning ||
        "Прогноз основан на потенциале статьи",
    },
    adaptationDifficulty: result.adaptationDifficulty || "medium",
    scriptRecommendations: result.scriptRecommendations || [],
  };
}
