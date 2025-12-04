import { useEffect } from "react"
import { queryClient } from "@/lib/query-client"
import { type AIAnalysis } from "../types/analysis-types"

export function useCachedAnalysis(
  projectId: string,
  step3Data: any,
  setShouldAnalyze: (should: boolean) => void,
  setAdvancedAnalysis: (analysis: any) => void,
  setAnalysisMode: (mode: 'simple' | 'advanced') => void,
  setAnalysisTime: (time: number | undefined) => void,
  setSelectedFormat: (format: string) => void,
  setAnalysis: (analysis: AIAnalysis | null) => void,
  setSelectedVariants: (variants: Record<number, number>) => void,
  setEditedScenes: (scenes: Record<number, string>) => void,
  setVariantScores: (scores: Record<string, number>) => void
) {
  // Load cached analysis from step3Data on mount
  useEffect(() => {
    console.log('[useCachedAnalysis] Checking step3Data:', {
      hasStep3Data: !!step3Data,
      step3DataType: typeof step3Data,
      step3DataKeys: step3Data ? Object.keys(step3Data) : [],
      hasSourceAnalysis: !!step3Data?.sourceAnalysis,
      hasRecommendedFormat: !!step3Data?.recommendedFormat,
      hasAdvancedAnalysis: !!step3Data?.advancedAnalysis,
      hasScenes: !!step3Data?.scenes
    });
    
    // Set recommended format from stepData if available (from article analysis)
    // recommendedFormat can be an object with formatId, or just a string
    if (step3Data?.recommendedFormat) {
      const formatValue = typeof step3Data.recommendedFormat === 'string' 
        ? step3Data.recommendedFormat 
        : step3Data.recommendedFormat.formatId || step3Data.recommendedFormat.format || 'news';
      setSelectedFormat(formatValue);
    }
    
    // CHECK CACHE FIRST! Don't call AI if we have cached data
    // step3Data contains cached analysis results from previous runs
    // step3Data.data contains the actual data (from database JSONB field)
    const step3DataContent = step3Data?.data || step3Data;
    
    if (step3DataContent?.sourceAnalysis && step3DataContent?.recommendedFormat) {
      // Load source analysis from cache (new format - from analyze-source endpoint)
      console.log('[Stage 3] ✅ Loading source analysis from cache (step3Data.sourceAnalysis)', {
        sourceAnalysis: step3DataContent.sourceAnalysis,
        recommendedFormat: step3DataContent.recommendedFormat
      });

      // Populate TanStack Query cache to prevent re-fetching
      queryClient.setQueryData(['/api/projects', projectId, 'analyze-source'], {
        analysis: step3DataContent.sourceAnalysis,
        recommendedFormat: step3DataContent.recommendedFormat,
        sourceMetadata: step3DataContent.sourceMetadata,
        metadata: step3DataContent.metadata || {}
      });

      setShouldAnalyze(true); // Mark as analyzed
    } else if (step3DataContent?.advancedAnalysis) {
      // Load advanced analysis from cache
      console.log('[Stage 3] ✅ Loading advanced analysis from cache (step3Data)');
      setAdvancedAnalysis(step3DataContent.advancedAnalysis);
      setAnalysisMode('advanced');
      setAnalysisTime(step3DataContent.analysisTime);
      setSelectedFormat(step3DataContent.selectedFormat || 'news');
    } else if (step3DataContent?.scenes && step3DataContent?.overallScore !== undefined) {
      // Load simple analysis from cache (legacy)
      console.log('[Stage 3] ✅ Loading simple analysis from cache (step3Data)');
      setAnalysis({
        format: step3DataContent.selectedFormat || 'news',
        overallScore: step3DataContent.overallScore,
        overallComment: step3DataContent.overallComment || '',
        scenes: step3DataContent.scenes
      });
      setAnalysisMode('simple');
      setSelectedFormat(step3DataContent.selectedFormat || 'news');
      setSelectedVariants(step3DataContent.selectedVariants || {});
      setEditedScenes(step3DataContent.editedScenes || {});
      setVariantScores(step3DataContent.variantScores || {});
    } else {
      console.log('[Stage 3] ℹ️ No cached analysis found - user must click "Analyze Content"')
    }
    // ❌ REMOVED AUTOMATIC ANALYSIS TRIGGER!
    // User must click "Start Analysis" button if no cache exists
    // This prevents unnecessary API calls every time project is opened
  }, [step3Data, projectId])
}
