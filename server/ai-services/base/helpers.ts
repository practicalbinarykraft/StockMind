import type { SceneAnalysis } from "./types";

// Normalize LLM response - handle different field names for scenes
export function normalizeScenes(rawResponse: any): SceneAnalysis[] {
  // Try different possible field names
  const scenesArray =
    rawResponse.scenes ||
    rawResponse.sceneList ||
    rawResponse.script ||
    rawResponse.sections ||
    [];

  if (!Array.isArray(scenesArray)) {
    console.warn('[normalizeScenes] scenes is not an array:', scenesArray);
    return [];
  }

  // Normalize scene structure
  return scenesArray.map((scene: any, index: number) => ({
    sceneNumber: scene.sceneNumber ?? scene.number ?? scene.id ?? (index + 1),
    text: scene.text ?? scene.content ?? scene.description ?? '',
    score: scene.score ?? 50,
    variants: Array.isArray(scene.variants) ? scene.variants : [],
  })).filter(scene => scene.text.length > 0);
}

/**
 * Normalize area values to ensure frontend compatibility
 */
export function normalizeArea(area?: string): 'hook' | 'structure' | 'emotional' | 'cta' | 'pacing' | 'general' {
  if (!area) return 'general';

  const key = area.toLowerCase().trim();

  // Map common variations to canonical names
  const aliases: Record<string, 'hook' | 'structure' | 'emotional' | 'cta' | 'pacing' | 'general'> = {
    emotion: 'emotional',
    emotions: 'emotional',
    clarity: 'structure',
    tempo: 'pacing',
    speed: 'pacing',
    overall: 'general',
  };

  // Check if it's already a valid area
  if (['hook', 'structure', 'emotional', 'cta', 'pacing', 'general'].includes(key)) {
    return key as any;
  }

  // Check aliases
  if (aliases[key]) {
    return aliases[key];
  }

  // Fallback to general for unknown areas
  return 'general';
}

// Estimate word count from text
export function estimateWordCount(text: string): number {
  return text.trim().split(/\s+/).length;
}

// Extract opening portion of text
export function extractOpening(text: string, maxChars: number = 200): string {
  return text.substring(0, maxChars);
}
