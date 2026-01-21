export interface Scene {
  id: number;
  text: string;
  sceneNumber?: number;
}

export interface SceneRecommendation {
  id: number | string; // number for fresh (temp), string (UUID) for persisted
  sceneId: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  area: string;
  currentText: string;
  suggestedText: string;
  reasoning: string;
  expectedImpact: string;
  appliedAt?: string;
  sourceAgent?: string;
  scoreDelta?: number;
  confidence?: number;
}

export interface SceneEditorProps {
  projectId: string;
  scenes: Scene[];
  activeVersionId?: string;
  onReanalyze?: (scenes: Scene[], fullScript: string) => void;
  onOpenCompare?: () => void;
  hasCandidate?: boolean;
  reanalyzeJobId?: string | null;
  jobStatus?: any;
}

export interface AnalysisResult {
  analysis: {
    overallScore: number;
    breakdown: {
      hook: { score: number };
      structure: { score: number };
      emotional: { score: number };
      cta: { score: number };
    };
    verdict: string;
    strengths: string[];
    weaknesses: string[];
  };
  recommendations: any[];
  review: string;
  cached: boolean;
}

export interface NormalizedScene extends Scene {
  sceneNumber: number;
}

/**
 * Normalize scenes to ensure they always have sceneNumber property
 */
export function normalizeScenes(scenes: any[]): NormalizedScene[] {
  return scenes.map((scene, idx) => ({
    ...scene,
    sceneNumber: scene.sceneNumber !== undefined ? scene.sceneNumber : (idx + 1)
  }));
}
