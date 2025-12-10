import { callClaudeJson } from "../lib/call-claude-json";
import { SECURITY_PREFIX, MAX_TOKENS_LONG } from "./base/constants";
import { normalizeScenes } from "./base/helpers";
import type { ScriptAnalysis } from "./base/types";

// Repair failed script analysis with minimal viable scenes
async function repairScriptAnalysis(
  apiKey: string,
  format: string,
  content: string,
  attemptNumber: number
): Promise<ScriptAnalysis> {
  console.log(`[Repair Attempt ${attemptNumber}] Trying to generate scenes...`);

  const sanitizedContent = content.substring(0, 3000).replaceAll('"', '\\"');

  const repairPrompt =
    SECURITY_PREFIX +
    `CRITICAL: Your previous response did not contain valid scenes array. This is attempt ${attemptNumber}/2.

You MUST return a valid JSON with a "scenes" array containing 3-5 scenes.

Content: "${sanitizedContent}"
Format: ${format}

Create 3-5 SHORT scenes (1-2 sentences each) for a ${format} video.

MANDATORY JSON structure - DO NOT deviate:
{
  "format": "${format}",
  "scenes": [
    {
      "sceneNumber": 1,
      "text": "<short compelling scene text in Russian>",
      "score": <number 0-100>,
      "variants": ["<variant 1>", "<variant 2>", "<variant 3>"]
    }
  ],
  "overallScore": <number 0-100>,
  "overallComment": "<brief comment in Russian>"
}

Return ONLY valid JSON. The "scenes" field is REQUIRED and MUST be an array with at least 3 items.`;
  console.log(
    `[AI] [analyzeScript] Generating script for ${repairPrompt.length}`
  );

  const result = await callClaudeJson<any>(apiKey, repairPrompt, {
    maxTokens: MAX_TOKENS_LONG,
    temperature: 0.7,
  });

  // Normalize and validate
  const normalizedScenes = normalizeScenes(result);

  return {
    format: result.format || format,
    scenes: normalizedScenes,
    recommendations: result.recommendations || [],
    overallScore: result.overallScore ?? 50,
    overallComment: result.overallComment || "Сценарий создан",
  };
}

/**
 * Analyze script and generate scenes with recommendations
 */
export async function analyzeScript(
  apiKey: string,
  format: string,
  content: string
): Promise<ScriptAnalysis> {
  const sanitizedContent = content.substring(0, 4000).replaceAll('"', '\\"');

  const prompt =
    SECURITY_PREFIX +
    `You are a professional video script analyzer creating viral short-form video scripts (Instagram Reels, TikTok, YouTube Shorts).

Content: "${sanitizedContent}"
Format: ${format}

🎯 CRITICAL REQUIREMENTS FOR EACH SCENE:

MUST HAVE (обязательно):
✅ Hook (Scene 1): Specific numbers/facts, emotional trigger, stops scrolling
   - ❌ BAD: "Сегодня расскажу об искусственном интеллекте" (score: 20-30)
   - ✅ GOOD: "Этот AI заработал $10,000 за ночь – и вот как" (score: 90-95)
   - ✅ GOOD: "OpenAI создала GPT-4, но мало кто знает про скрытую фичу" (score: 85-90)

✅ Specificity: Concrete numbers, dates, names, facts
   - ❌ BAD: "много денег", "недавно", "некоторые люди"
   - ✅ GOOD: "$10,247 за 18 дней", "вчера в 15:00", "3 ошибки которые стоили $50,000"

✅ Emotional triggers: Fear, greed, curiosity, FOMO, anger
   - ❌ BAD: "интересная тема", "полезная информация"
   - ✅ GOOD: "шокировал", "разрушил мою жизнь", "секрет который изменил всё"

✅ Direct address: Use "ты" (you) for relatability
   - ❌ BAD: "люди делают", "они думают"
   - ✅ GOOD: "ты делаешь", "твоя ошибка", "попробуй завтра"

✅ Scene length: 1-2 sentences max, 5-15 words per scene
   - Each scene should be punchy, no filler words

FORBIDDEN (запрещено):
❌ Generic phrases: "очень интересно", "давайте разберем", "как вы знаете"
❌ Passive voice: "было сделано", "можно увидеть"
❌ Long sentences: >20 words per scene
❌ Weak CTAs: "подписывайтесь", "ставьте лайк" (only at the end, and make it specific)

Task 1: Create 3-5 compelling scenes. For each scene:
1. Write scene text (MUST follow requirements above)
2. Score viral potential (0-100) - be strict, generic = 20-40, specific = 80-95
3. Generate 3 alternative variants (each improving on previous)

Task 2: As multi-agent team, provide improvement recommendations:
- Hook Expert: First 3 seconds, attention grab, pattern interrupts
- Structure Analyst: Pacing, transitions, information density
- Emotional Analyst: Emotional resonance, relatability, pain points
- CTA Expert: Ending, call-to-action, shareability

For each recommendation:
- sceneNumber: which scene (1, 2, 3, etc.)
- area: "hook" | "structure" | "emotional" | "cta"
- priority: "high" | "medium" | "low"
- current: current text from scene
- suggested: improved version (MUST be specific, emotional, direct)
- reasoning: why this improves virality (in Russian)
- expectedImpact: expected score improvement (e.g., "+15-20 points")

SELF-CHECK before responding:
1. Scene 1 has specific numbers/facts? (if not, score <50)
2. All scenes use "ты" or direct address? (if not, -10 points)
3. No generic phrases? (if found, -15 points)
4. Each scene is 1-2 sentences? (if longer, -10 points)
5. CTA is specific and actionable? (if generic, -20 points)

Respond ONLY in valid JSON:
{
  "format": "${format}",
  "scenes": [
    {
      "sceneNumber": 1,
      "text": "<compelling scene text in Russian, 5-15 words, specific, emotional>",
      "score": <0-100, be strict: generic=20-40, specific=80-95>,
      "variants": [
        "<variant 1: even more specific>",
        "<variant 2: stronger emotional trigger>",
        "<variant 3: better hook pattern>"
      ]
    }
  ],
  "recommendations": [
    {
      "sceneNumber": 1,
      "area": "hook",
      "priority": "high",
      "current": "<current text>",
      "suggested": "<improved version: specific, emotional, direct>",
      "reasoning": "<why this improves virality in Russian>",
      "expectedImpact": "+15-20 points"
    }
  ],
  "overallScore": <0-100, weighted average of scene scores>,
  "overallComment": "<1-2 sentence analysis in Russian>"
}`;

  console.log(`[AI] [analyzeScript] Generating script for format: ${format}`);
  const rawResult = await callClaudeJson<any>(apiKey, prompt, {
    maxTokens: MAX_TOKENS_LONG,
    timeoutMs: 120_000, // 2 minutes timeout for script generation
  });

  console.log(`[analyzeScript] Raw LLM response keys:`, Object.keys(rawResult));

  // Normalize scenes from different possible field names
  const normalizedScenes = normalizeScenes(rawResult);

  // If no scenes after normalization, attempt repair (up to 2 attempts)
  if (normalizedScenes.length === 0) {
    console.warn(
      `[analyzeScript] No scenes found after normalization. Attempting repair...`
    );

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const repaired = await repairScriptAnalysis(
          apiKey,
          format,
          content,
          attempt
        );
        if (repaired.scenes.length >= 3) {
          console.log(
            `[analyzeScript] Repair successful on attempt ${attempt}: ${repaired.scenes.length} scenes`
          );
          return repaired;
        }
        console.warn(
          `[analyzeScript] Repair attempt ${attempt} generated only ${repaired.scenes.length} scenes (minimum 3 required)`
        );
      } catch (error) {
        console.error(
          `[analyzeScript] Repair attempt ${attempt} failed:`,
          error
        );
      }
    }

    // All repair attempts failed
    const error: any = new Error("NO_SCENES");
    error.code = "NO_SCENES";
    error.details = {
      message: "AI не смог создать сценарий после нескольких попыток",
      rawResponse: rawResult,
      suggestions: [
        "Попробуйте другой формат видео",
        "Упростите исходный контент",
        "Повторите попытку через несколько секунд",
      ],
    };
    throw error;
  }

  console.log(
    `[analyzeScript] Successfully generated ${normalizedScenes.length} scenes`
  );

  return {
    format: rawResult.format || format,
    scenes: normalizedScenes,
    recommendations: rawResult.recommendations || [],
    overallScore: rawResult.overallScore ?? 50,
    overallComment: rawResult.overallComment || "Анализ завершён",
  };
}
