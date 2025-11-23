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

  const repairPrompt = SECURITY_PREFIX + `CRITICAL: Your previous response did not contain valid scenes array. This is attempt ${attemptNumber}/2.

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
  content: string,
): Promise<ScriptAnalysis> {
  const sanitizedContent = content.substring(0, 4000).replaceAll('"', '\\"');

  const prompt = SECURITY_PREFIX + `You are a professional video script analyzer with a team of AI agents (Hook Expert, Structure Analyst, Emotional Analyst, CTA Expert). Analyze this content for ${format} format video.

Content: "${sanitizedContent}"

Task 1: Break it down into 3-5 compelling scenes for short-form video. For each scene:
1. Write the scene text (compelling, punchy, engaging)
2. Score its viral potential (0-100)
3. Generate 3 alternative rewrite variants

Task 2: As a multi-agent team, provide scene-by-scene improvement recommendations:
- Hook Expert: Analyze attention grab, first 3 seconds, pattern interrupts
- Structure Analyst: Analyze pacing, transitions, information density
- Emotional Analyst: Analyze emotional resonance, relatability, impact
- CTA Expert: Analyze ending, call-to-action, shareability

For each recommendation include:
- sceneNumber: which scene this applies to (1, 2, 3, etc.)
- area: "hook" | "structure" | "emotional" | "cta"
- priority: "high" | "medium" | "low"
- current: current text from the scene
- suggested: improved version
- reasoning: why this change improves virality
- expectedImpact: expected score improvement (e.g., "+15 points")

Respond in JSON format:
{
  "format": "${format}",
  "scenes": [
    {
      "sceneNumber": 1,
      "text": "<scene text in Russian>",
      "score": <0-100>,
      "variants": ["<variant 1>", "<variant 2>", "<variant 3>"]
    }
  ],
  "recommendations": [
    {
      "sceneNumber": 1,
      "area": "hook",
      "priority": "high",
      "current": "<current text>",
      "suggested": "<improved text>",
      "reasoning": "<why this improves virality>",
      "expectedImpact": "+15 points"
    }
  ],
  "overallScore": <0-100>,
  "overallComment": "<1-2 sentence analysis in Russian>"
}`;

  console.log(`[analyzeScript] Generating script for format: ${format}`);
  const rawResult = await callClaudeJson<any>(apiKey, prompt, {
    maxTokens: MAX_TOKENS_LONG
  });

  console.log(`[analyzeScript] Raw LLM response keys:`, Object.keys(rawResult));

  // Normalize scenes from different possible field names
  const normalizedScenes = normalizeScenes(rawResult);

  // If no scenes after normalization, attempt repair (up to 2 attempts)
  if (normalizedScenes.length === 0) {
    console.warn(`[analyzeScript] No scenes found after normalization. Attempting repair...`);

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const repaired = await repairScriptAnalysis(apiKey, format, content, attempt);
        if (repaired.scenes.length >= 3) {
          console.log(`[analyzeScript] Repair successful on attempt ${attempt}: ${repaired.scenes.length} scenes`);
          return repaired;
        }
        console.warn(`[analyzeScript] Repair attempt ${attempt} generated only ${repaired.scenes.length} scenes (minimum 3 required)`);
      } catch (error) {
        console.error(`[analyzeScript] Repair attempt ${attempt} failed:`, error);
      }
    }

    // All repair attempts failed
    const error: any = new Error('NO_SCENES');
    error.code = 'NO_SCENES';
    error.details = {
      message: 'AI не смог создать сценарий после нескольких попыток',
      rawResponse: rawResult,
      suggestions: [
        'Попробуйте другой формат видео',
        'Упростите исходный контент',
        'Повторите попытку через несколько секунд'
      ]
    };
    throw error;
  }

  console.log(`[analyzeScript] Successfully generated ${normalizedScenes.length} scenes`);

  return {
    format: rawResult.format || format,
    scenes: normalizedScenes,
    recommendations: rawResult.recommendations || [],
    overallScore: rawResult.overallScore ?? 50,
    overallComment: rawResult.overallComment || "Анализ завершён",
  };
}
