// Article Potential Analysis Types
// Used for analyzing article's potential to become a video script (Level 2)

export interface ArticlePotentialResult {
  // Overall score (0-100)
  score: number;
  
  // Verdict
  verdict: 'excellent' | 'good' | 'moderate' | 'weak';
  
  // Confidence in assessment (0-1)
  confidence: number;
  
  // Detailed breakdown
  breakdown: {
    // Hook potential (can we create a hook from title/facts?)
    hookPotential: {
      score: number; // 0-100
      hasHookMaterial: boolean;
      suggestedHook?: string;
      reasoning: string;
    };
    
    // Content sufficiency (enough material for 15-20 sec video?)
    contentSufficiency: {
      score: number; // 0-100
      hasEnoughFacts: boolean;
      factCount: number;
      reasoning: string;
    };
    
    // Emotional angle (what emotions can we trigger?)
    emotionalAngle: {
      score: number; // 0-100
      primaryEmotion: 'fomo' | 'curiosity' | 'shock' | 'anger' | 'joy' | 'fear' | 'greed' | 'neutral';
      strength: number; // 0-100
      reasoning: string;
    };
    
    // Visual potential (what can we show?)
    visualPotential: {
      score: number; // 0-100
      hasVisualElements: boolean;
      suggestedVisuals: string[];
      reasoning: string;
    };
    
    // Format recommendation
    recommendedFormat: {
      format: 'news_update' | 'explainer' | 'story' | 'comparison' | 'tutorial' | 'trend';
      confidence: number; // 0-100
      reasoning: string;
    };
  };
  
  // Why this article can become a good video
  strengths: string[];
  
  // What might be challenging
  weaknesses: string[];
  
  // Video score prediction (if well adapted)
  videoScorePrediction: {
    ifWellAdapted: string; // e.g., "75-80/100"
    ifPoorlyAdapted: string; // e.g., "60-65/100"
    reasoning: string;
  };
  
  // Adaptation difficulty
  adaptationDifficulty: 'easy' | 'medium' | 'hard';
  
  // Specific recommendations for script creation
  scriptRecommendations: string[];
}

