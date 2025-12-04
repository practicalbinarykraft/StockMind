// Re-export types from shared advanced analysis types
export type {
  AdvancedScoreResult,
  HookAnalysis,
  StructureAnalysis,
  EmotionalAnalysis,
  CTAAnalysis,
  HookBreakdown,
  StructureBreakdown,
  EmotionalBreakdown,
  CTABreakdown,
  ContentInput,
  CriterionScore,
  HookImprovement,
  CTAImprovement,
  Recommendation,
  PatternMatch,
  MissingPattern,
} from "@shared/advanced-analysis-types";

// Basic AI service result interfaces
export interface NewsScoreResult {
  score: number;
  comment: string;
}

export interface ReelScoreResult {
  score: number;
  comment: string;
  freshnessScore?: number;
  viralityScore?: number;
  qualityScore?: number;
}

export interface SceneAnalysis {
  sceneNumber: number;
  text: string;
  score: number;
  variants: string[];
}

export interface SceneRecommendation {
  sceneNumber: number;
  area: 'hook' | 'structure' | 'emotional' | 'cta' | 'pacing' | 'clarity' | 'general';
  priority: 'high' | 'medium' | 'low';
  current: string;
  suggested: string;
  reasoning: string;
  expectedImpact: string;
  delta?: number; // Expected score boost (0-20)
}

export interface ScriptAnalysis {
  format: string;
  scenes: SceneAnalysis[];
  recommendations?: SceneRecommendation[];
  overallScore: number;
  overallComment: string;
}
