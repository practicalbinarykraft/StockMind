import type { AdvancedScoreResult } from "@shared/advanced-analysis-types";
import { analyzeHook } from "./agents/hook.agent";
import { analyzeStructure } from "./agents/structure.agent";
import { analyzeEmotionalImpact } from "./agents/emotional.agent";
import { analyzeCTA } from "./agents/cta.agent";
import { synthesizeAnalysis } from "./agents/architect.agent";

/**
 * Analyze SCRIPT quality using advanced multi-agent analysis (Level 3)
 * 
 * IMPORTANT: This analyzes a SCRIPT (video script with scenes), NOT an article!
 * Use analyzeArticlePotential() for articles.
 * 
 * This function is used AFTER a script has been created from an article.
 * It evaluates the quality of the READY script using:
 * - Hook Expert (first scene)
 * - Structure Analyst (pacing, length)
 * - Emotional Impact Analyst (triggers)
 * - CTA Analyst (call-to-action)
 * - Architect (synthesis)
 */
export async function analyzeScriptAdvanced(
  apiKey: string,
  scriptText: string,
  contentType: 'news' | 'instagram_reel' | 'custom_script' = 'custom_script'
): Promise<AdvancedScoreResult> {
  // Run all agents in parallel
  const [hook, structure, emotional, cta] = await Promise.all([
    analyzeHook(apiKey, scriptText),
    analyzeStructure(apiKey, scriptText),
    analyzeEmotionalImpact(apiKey, scriptText),
    analyzeCTA(apiKey, scriptText)
  ]);

  // Architect synthesizes results
  return synthesizeAnalysis(apiKey, hook, structure, emotional, cta, contentType);
}

/**
 * @deprecated Use analyzeScriptAdvanced() for scripts or analyzeArticlePotential() for articles.
 * This function name is misleading and will be removed in v2.0.0.
 * 
 * Migration guide:
 * - For articles: Use analyzeArticlePotential(apiKey, title, content)
 * - For scripts: Use analyzeScriptAdvanced(apiKey, scriptText, 'news')
 * 
 * Kept for backward compatibility only.
 */
export async function scoreNewsAdvanced(
  apiKey: string,
  title: string,
  content: string
): Promise<AdvancedScoreResult> {
  console.warn(
    '[DEPRECATED] scoreNewsAdvanced() is deprecated and will be removed in v2.0.0.\n' +
    '  - For articles: Use analyzeArticlePotential() instead\n' +
    '  - For scripts: Use analyzeScriptAdvanced() instead\n' +
    '  See: https://github.com/your-repo/docs/migration-guide'
  );
  
  // This was incorrectly used for articles - now redirects to script analysis
  // For article analysis, use analyzeArticlePotential() instead
  const fullContent = `${title}\n\n${content}`;
  return analyzeScriptAdvanced(apiKey, fullContent, 'news');
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
