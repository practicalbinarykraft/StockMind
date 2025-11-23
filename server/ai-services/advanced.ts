import type { AdvancedScoreResult } from "@shared/advanced-analysis-types";
import { analyzeHook } from "./agents/hook.agent";
import { analyzeStructure } from "./agents/structure.agent";
import { analyzeEmotionalImpact } from "./agents/emotional.agent";
import { analyzeCTA } from "./agents/cta.agent";
import { synthesizeAnalysis } from "./agents/architect.agent";

/**
 * Score news article using advanced multi-agent analysis
 */
export async function scoreNewsAdvanced(
  apiKey: string,
  title: string,
  content: string
): Promise<AdvancedScoreResult> {
  const fullContent = `${title}\n\n${content}`;

  // Run all agents in parallel
  const [hook, structure, emotional, cta] = await Promise.all([
    analyzeHook(apiKey, fullContent),
    analyzeStructure(apiKey, fullContent),
    analyzeEmotionalImpact(apiKey, fullContent),
    analyzeCTA(apiKey, fullContent)
  ]);

  // Architect synthesizes results
  return synthesizeAnalysis(apiKey, hook, structure, emotional, cta, 'news');
}

/**
 * Score Instagram Reel using advanced multi-agent analysis
 */
export async function scoreReelAdvanced(
  apiKey: string,
  transcription: string,
  caption: string | null
): Promise<AdvancedScoreResult> {
  const fullContent = caption
    ? `${transcription}\n\nCaption: ${caption}`
    : transcription;

  // Run all agents in parallel
  const [hook, structure, emotional, cta] = await Promise.all([
    analyzeHook(apiKey, fullContent),
    analyzeStructure(apiKey, fullContent),
    analyzeEmotionalImpact(apiKey, fullContent),
    analyzeCTA(apiKey, fullContent)
  ]);

  // Architect synthesizes results
  return synthesizeAnalysis(apiKey, hook, structure, emotional, cta, 'instagram_reel');
}

/**
 * Score custom script using advanced multi-agent analysis
 */
export async function scoreCustomScriptAdvanced(
  apiKey: string,
  text: string,
  format: string,
  scenes?: Array<{ text: string; duration: number }>
): Promise<AdvancedScoreResult> {
  // Run all agents in parallel
  const [hook, structure, emotional, cta] = await Promise.all([
    analyzeHook(apiKey, text),
    analyzeStructure(apiKey, text, { scenes }),
    analyzeEmotionalImpact(apiKey, text),
    analyzeCTA(apiKey, text)
  ]);

  // Architect synthesizes results
  return synthesizeAnalysis(apiKey, hook, structure, emotional, cta, 'custom_script');
}

// Re-export agents for direct use if needed
export { analyzeHook, analyzeStructure, analyzeEmotionalImpact, analyzeCTA, synthesizeAnalysis };
