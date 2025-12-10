import type {
  AdvancedScoreResult,
  HookAnalysis,
  StructureAnalysis,
  EmotionalAnalysis,
  CTAAnalysis,
} from "@shared/advanced-analysis-types";
import { callClaude } from "../base/claude-client";

/**
 * AGENT 5: ARCHITECT (SYNTHESIS)
 * Synthesizes all agent analyses into a comprehensive result
 */
export async function synthesizeAnalysis(
  apiKey: string,
  hookAnalysis: HookAnalysis,
  structureAnalysis: StructureAnalysis,
  emotionalAnalysis: EmotionalAnalysis,
  ctaAnalysis: CTAAnalysis,
  contentType: "news" | "instagram_reel" | "custom_script"
): Promise<AdvancedScoreResult> {
  const prompt = `You are the Architect - master AI strategist synthesizing multi-agent content analysis.

You have received analysis from 4 specialist agents:

HOOK EXPERT:
- Score: ${hookAnalysis.hookScore}/100
- Type: ${hookAnalysis.hookType}
- Key issues: ${JSON.stringify(hookAnalysis.breakdown.currentHook)}

STRUCTURE ANALYST:
- Score: ${structureAnalysis.structureScore}/100
- WPM: ${structureAnalysis.breakdown.pacing.wpm}
- Length: ${structureAnalysis.breakdown.optimalLength.current}s

EMOTIONAL ANALYST:
- Score: ${emotionalAnalysis.emotionalScore}/100
- Primary emotion: ${emotionalAnalysis.breakdown.primaryEmotion.type}
- Relatability: ${emotionalAnalysis.breakdown.relatability}/100

CTA ANALYST:
- Score: ${ctaAnalysis.ctaScore}/100
- Has CTA: ${ctaAnalysis.breakdown.presence.hasCTA}
- Type: ${ctaAnalysis.breakdown.presence.type || "none"}

Content type: ${contentType}

Your task:
1. Calculate OVERALL SCORE (weighted average, 0-100)
2. Assign VERDICT: viral (90+), strong (70-89), moderate (50-69), weak (<50)
3. Identify top 3 STRENGTHS
4. Identify top 3 WEAKNESSES
5. Create 3-5 prioritized RECOMMENDATIONS with specific changes
6. Match against viral PATTERNS
7. Predict performance metrics

Respond ONLY in valid JSON format:
{
  "overallScore": <0-100>,
  "verdict": "viral|strong|moderate|weak",
  "confidence": <0.0-1.0>,
  "strengths": [
    "<strength in Russian>",
    "<strength in Russian>",
    "<strength in Russian>"
  ],
  "weaknesses": [
    "<weakness in Russian>",
    "<weakness in Russian>",
    "<weakness in Russian>"
  ],
  "recommendations": [
    {
      "priority": "critical|high|medium|low",
      "area": "hook|structure|emotional|cta|pacing|length",
      "current": "<current state>",
      "suggested": "<specific change in Russian>",
      "expectedImpact": "<predicted result e.g. '+15-20 points'>",
      "reasoning": "<why this matters in Russian>"
    }
  ],
  "viralPatterns": {
    "matched": [
      {"pattern": "<pattern name>", "confidence": <0-100>}
    ],
    "missing": [
      {"pattern": "<pattern name>", "potentialBoost": "<e.g. '+10-15 points'>"}
    ]
  },
  "predictedMetrics": {
    "estimatedRetention": "<e.g. '55-65%'>",
    "estimatedSaves": "<e.g. '3-5% of viewers'>",
    "estimatedShares": "<e.g. '1-2% of viewers'>",
    "viralProbability": "low|medium|medium-high|high"
  }
}`;

  console.log(`[AI] agent architect`);

  const result = await callClaude(apiKey, prompt, {
    model: "claude-sonnet-4-5", // Use Sonnet 4.5 for synthesis
    maxTokens: 3072,
  });

  return {
    overallScore: result.overallScore,
    verdict: result.verdict,
    confidence: result.confidence,
    // Agent scores (top-level for easy access in routes.ts)
    hookScore: hookAnalysis.hookScore,
    structureScore: structureAnalysis.structureScore,
    emotionalScore: emotionalAnalysis.emotionalScore,
    ctaScore: ctaAnalysis.ctaScore,
    breakdown: {
      hook: hookAnalysis.breakdown,
      structure: structureAnalysis.breakdown,
      emotional: emotionalAnalysis.breakdown,
      cta: ctaAnalysis.breakdown,
    },
    strengths: result.strengths,
    weaknesses: result.weaknesses,
    recommendations: result.recommendations,
    viralPatterns: result.viralPatterns,
    predictedMetrics: result.predictedMetrics,
  };
}
