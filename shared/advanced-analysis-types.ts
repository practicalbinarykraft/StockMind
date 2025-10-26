// Advanced AI Analysis Types for Multi-Agent System

// ============================================
// CORE RESULT INTERFACES
// ============================================

export interface AdvancedScoreResult {
  // Overall assessment
  overallScore: number;  // 0-100
  verdict: 'viral' | 'strong' | 'moderate' | 'weak';
  confidence: number;  // 0-1
  
  // Agent scores (top-level for easy access)
  structureScore?: number;  // 0-100
  emotionalScore?: number;  // 0-100
  ctaScore?: number;  // 0-100
  
  // Detailed breakdown
  breakdown: {
    hook: HookBreakdown;
    structure: StructureBreakdown;
    emotional: EmotionalBreakdown;
    cta: CTABreakdown;
  };
  
  // What works / doesn't work
  strengths: string[];
  weaknesses: string[];
  
  // Actionable recommendations
  recommendations: Recommendation[];
  
  // Pattern matching
  viralPatterns: {
    matched: PatternMatch[];
    missing: MissingPattern[];
  };
  
  // Predictions
  predictedMetrics?: {
    estimatedRetention: string;
    estimatedSaves: string;
    estimatedShares: string;
    viralProbability: 'low' | 'medium' | 'medium-high' | 'high';
  };
}

// ============================================
// BREAKDOWN INTERFACES
// ============================================

export interface HookBreakdown {
  score: number;  // 0-100
  type: 'question' | 'stat' | 'problem' | 'curiosity' | 'story' | 'command';
  
  criteria: {
    attentionGrab: CriterionScore;
    clarity: CriterionScore;
    specificity: CriterionScore;
    emotional: CriterionScore;
    patternMatch: CriterionScore;
  };
  
  currentHook: string;
  improvements: HookImprovement[];
}

export interface StructureBreakdown {
  score: number;  // 0-100
  
  pacing: {
    wpm: number;  // Words per minute
    rating: 'too-slow' | 'optimal' | 'fast' | 'too-fast';
    score: number;
  };
  
  informationDensity: {
    factsPerSecond: number;
    rating: 'sparse' | 'optimal' | 'dense' | 'overwhelming';
    score: number;
  };
  
  sceneFlow: {
    hasLogicalProgression: boolean;
    structure: string;  // e.g., "problem-solution-cta"
    score: number;
  };
  
  optimalLength: {
    current: number;  // seconds
    recommended: number;
    score: number;
  };
  
  retentionCurve?: Array<{
    time: number;
    retention: number;
  }>;
  
  improvements: string[];
}

export interface EmotionalBreakdown {
  score: number;  // 0-100
  
  primaryEmotion: {
    type: 'fear' | 'greed' | 'curiosity' | 'anger' | 'joy' | 'fomo' | 'pride';
    strength: number;  // 0-100
  };
  
  secondaryEmotion?: {
    type: string;
    strength: number;
  };
  
  painPoints: string[];
  relatability: number;  // 0-100
  shareabilityScore: number;  // 0-100
  
  triggers: {
    identified: string[];
    strength: number;
  };
}

export interface CTABreakdown {
  score: number;  // 0-100
  
  presence: {
    hasCTA: boolean;
    type?: 'subscribe' | 'save' | 'share' | 'comment' | 'click' | 'custom';
    score: number;
  };
  
  placement: {
    timing: 'early' | 'mid' | 'end' | 'missing';
    isOptimal: boolean;
    score: number;
  };
  
  effectiveness: {
    specificity: number;  // 0-100
    frictionLevel: 'low' | 'medium' | 'high';
    score: number;
  };
  
  current?: string;
  improvements: CTAImprovement[];
}

// ============================================
// SUPPORTING TYPES
// ============================================

export interface CriterionScore {
  score: number;  // 0-100
  reason: string;
  improvement?: string;
}

export interface HookImprovement {
  variant: string;
  changes: string[];
  expectedScore: number;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
}

export interface CTAImprovement {
  suggested: string;
  reasoning: string;
  expectedImpact: string;
  priority: 'high' | 'medium' | 'low';
}

export interface Recommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  area: 'hook' | 'structure' | 'emotional' | 'cta' | 'pacing' | 'length';
  current: string;
  suggested: string;
  expectedImpact: string;
  reasoning: string;
}

export interface PatternMatch {
  pattern: string;
  confidence: number;  // 0-100
  description?: string;
}

export interface MissingPattern {
  pattern: string;
  potentialBoost: string;
  howToImplement?: string;
}

// ============================================
// AGENT-SPECIFIC RESULTS
// ============================================

export interface HookAnalysis {
  hookScore: number;
  hookType: string;
  breakdown: HookBreakdown;
}

export interface StructureAnalysis {
  structureScore: number;
  breakdown: StructureBreakdown;
}

export interface EmotionalAnalysis {
  emotionalScore: number;
  breakdown: EmotionalBreakdown;
}

export interface CTAAnalysis {
  ctaScore: number;
  breakdown: CTABreakdown;
}

// ============================================
// ARCHITECT SYNTHESIS
// ============================================

export interface ArchitectSynthesis {
  findings: string[];
  whatWorked: string[];
  whatToFix: string[];
  experiments: Experiment[];
  nextScriptSeed?: ScriptSeed;
}

export interface Experiment {
  id: string;
  title: string;
  change: string;
  expectedImpact: 'low' | 'medium' | 'high';
  howToMeasure: string;
}

export interface ScriptSeed {
  hook: string;
  outline: string[];
  cta: string;
  reasoning: string;
}

// ============================================
// INPUT TYPES
// ============================================

export interface ContentInput {
  text: string;
  format?: string;
  metadata?: {
    title?: string;
    caption?: string;
    duration?: number;
    scenes?: Array<{
      text: string;
      duration: number;
    }>;
  };
}

export interface PerformanceMetrics {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  avgWatchTime?: number;
  retention?: number;
}

// ============================================
// SCENE-LEVEL RECOMMENDATIONS
// ============================================

export interface SceneRecommendation {
  id?: number;
  sceneId: number; // Scene number (1-indexed)
  priority: 'critical' | 'high' | 'medium' | 'low';
  area: 'hook' | 'structure' | 'emotional' | 'cta' | 'pacing' | 'general';
  currentText: string;
  suggestedText: string;
  reasoning: string;
  expectedImpact: string; // e.g., "+14 points"
  scoreDelta?: number; // Extracted from expectedImpact
  confidence?: number; // 0-1
  applied?: boolean;
  appliedAt?: string;
  sourceAgent?: string; // Which AI agent generated this
}
