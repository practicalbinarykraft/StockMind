import type { StructureAnalysis, StructureBreakdown } from "@shared/advanced-analysis-types";
import { callClaude } from "../base/claude-client";
import { estimateWordCount } from "../base/helpers";

/**
 * AGENT 2: STRUCTURE ANALYST
 * Analyzes pacing, information density, and optimal length
 */
export async function analyzeStructure(
  apiKey: string,
  content: string,
  metadata?: {
    duration?: number;
    scenes?: Array<{ text: string; duration: number }>;
  }
): Promise<StructureAnalysis> {
  const wordCount = estimateWordCount(content);
  const estimatedDuration = metadata?.duration || (wordCount / 3); // ~180 WPM = 3 words/sec
  const wpm = Math.round((wordCount / estimatedDuration) * 60);

  const scenesText = metadata?.scenes
    ? metadata.scenes.map((s, i) => `Scene ${i + 1} (${s.duration}s): "${s.text}"`).join('\n')
    : `Full content: "${content}"`;

  const prompt = `You are a Structure Analyst for short-form video content.

Content analysis:
${scenesText}

Estimated duration: ${estimatedDuration} seconds
Word count: ${wordCount}
Calculated WPM: ${wpm}

Analyze STRUCTURE across these criteria:

1. PACING (0-100)
   - Words per minute evaluation:
     • 120-140 WPM = too slow, boring (score: 30-50)
     • 160-180 WPM = optimal, engaging (score: 85-95)
     • 180-200 WPM = fast, energetic (score: 75-85)
     • 200-220 WPM = very fast, risky (score: 60-75)
     • >220 WPM = too fast, overwhelming (score: 30-50)
   - Are there strategic pauses?

2. INFORMATION DENSITY (0-100)
   - Facts/value points per second
   - Too sparse = boring (1 fact per 10s = score 30-40)
   - Optimal = engaging (1 fact per 3-5s = score 85-95)
   - Too dense = overwhelming (3+ facts per second = score 50-60)

3. SCENE FLOW (0-100)
   - Logical progression (hook → body → cta)?
   - Clear structure or chaotic?
   - Build-up to climax?

4. OPTIMAL LENGTH (0-100)
   - For this content type, is length appropriate?
   - 7-12s = ultra-short, hook-only (score varies by content)
   - 15-25s = sweet spot for most content (score: 90-100)
   - 25-35s = acceptable if content is strong (score: 70-85)
   - 35-45s = risky, needs exceptional content (score: 50-70)
   - >45s = too long for shorts (score: 20-40)

5. RETENTION CURVE PREDICTION (0-100)
   - Predict viewer drop-off at key moments
   - Where will attention dip?
   - Overall predicted retention percentage

Respond ONLY in valid JSON format:
{
  "structureScore": <average of criteria, 0-100>,
  "breakdown": {
    "pacing": {
      "wpm": ${wpm},
      "rating": "too-slow|optimal|fast|too-fast",
      "score": <0-100>
    },
    "informationDensity": {
      "factsPerSecond": <estimated number>,
      "rating": "sparse|optimal|dense|overwhelming",
      "score": <0-100>
    },
    "sceneFlow": {
      "hasLogicalProgression": <true|false>,
      "structure": "<describe structure e.g. 'hook-problem-solution-cta'>",
      "score": <0-100>
    },
    "optimalLength": {
      "current": ${estimatedDuration},
      "recommended": <recommended duration in seconds>,
      "score": <0-100>
    },
    "retentionCurve": [
      {"time": 0, "retention": 100},
      {"time": 3, "retention": <predicted %>},
      {"time": 8, "retention": <predicted %>},
      {"time": 15, "retention": <predicted %>}
    ],
    "improvements": [
      "<specific improvement suggestion in Russian>",
      "<another suggestion in Russian>"
    ]
  }
}`;

  const result = await callClaude(apiKey, prompt, { maxTokens: 2048 });

  return {
    structureScore: result.structureScore,
    breakdown: result.breakdown as StructureBreakdown
  };
}
