import { callClaudeJson } from "../lib/call-claude-json";
import { SECURITY_PREFIX } from "./base/constants";
import { normalizeArea } from "./base/helpers";
import type { SceneRecommendation } from "./base/types";

/**
 * Generate per-scene recommendations with specific text improvements
 * This is the "magic" feature that shows concrete suggestions for each scene
 */
export async function generateSceneRecommendations(
  apiKey: string,
  scenes: Array<{ sceneNumber: number; text: string }>,
  context?: {
    format?: string;
    language?: string;
    goal?: string;
    tone?: string;
  }
): Promise<SceneRecommendation[]> {
  const {
    format = "Hook&Story",
    language = "ru",
    goal = "maximize retention and saves",
    tone = "neutral",
  } = context || {};

  console.log(
    `[generateSceneRecommendations] Analyzing ${scenes.length} scenes...`
  );

  // Limit parallelism to avoid rate limits (process 2-3 scenes at a time)
  const BATCH_SIZE = 2;
  const allRecommendations: SceneRecommendation[] = [];

  for (let i = 0; i < scenes.length; i += BATCH_SIZE) {
    const batch = scenes.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(async (scene) => {
      const prompt =
        SECURITY_PREFIX +
        `You are a short-form video script doctor.
You improve one scene at a time for TikTok/IG Reels/Shorts.
Return strict JSON.

Input:
{
  "sceneNumber": ${scene.sceneNumber},
  "currentText": "${scene.text.substring(0, 500).replaceAll('"', '\\"')}",
  "format": "${format}",
  "language": "${language}",
  "goal": "${goal}",
  "tone": "${tone}"
}

Analyze this scene and provide ONE concrete improvement.

Return JSON with this EXACT structure:
{
  "suggestedText": "<improved scene text in Russian, max 40 words>",
  "area": "<one of: hook|structure|emotion|cta|pacing|clarity>",
  "priority": "<one of: high|medium|low>",
  "delta": <integer 0-20>,
  "rationale": "<why this improves virality, max 30 words in Russian>"
}`;

      try {
        console.log(`[AI] scene recomendations`);
        const result = await callClaudeJson<any>(apiKey, prompt, {
          maxTokens: 512,
          timeoutMs: 20_000,
        });

        return {
          sceneNumber: scene.sceneNumber,
          area: normalizeArea(result.area), // Normalize to ensure frontend compatibility
          priority: result.priority || "medium",
          current: scene.text,
          suggested: result.suggestedText || scene.text,
          reasoning: result.rationale || "",
          expectedImpact: result.delta
            ? `+${result.delta} points`
            : "+10 points",
          delta: result.delta || 10,
        };
      } catch (error: any) {
        console.error(
          `[generateSceneRecommendations] Failed for scene ${scene.sceneNumber}:`,
          error.message
        );
        // Return null for failed scenes, filter later
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    const validResults = batchResults.filter(
      (r) => r !== null
    ) as SceneRecommendation[];
    allRecommendations.push(...validResults);

    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < scenes.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log(
    `[generateSceneRecommendations] Generated ${allRecommendations.length}/${scenes.length} recommendations`
  );
  return allRecommendations;
}
