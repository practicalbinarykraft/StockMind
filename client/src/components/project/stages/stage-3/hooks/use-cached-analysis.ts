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
    // CHECK CACHE FIRST! Don't call AI if we have cached data
    // step3Data contains cached analysis results from previous runs
    if (step3Data?.sourceAnalysis && step3Data?.recommendedFormat) {
      // Load source analysis from cache (new format - from analyze-source endpoint)
      console.log('[Stage 3] ✅ Loading source analysis from cache (step3Data.sourceAnalysis)')

      // Populate TanStack Query cache to prevent re-fetching
      queryClient.setQueryData(['/api/projects', projectId, 'analyze-source'], {
        analysis: step3Data.sourceAnalysis,
        recommendedFormat: step3Data.recommendedFormat,
        sourceMetadata: step3Data.sourceMetadata,
        metadata: step3Data.metadata || {}
      })

      setShouldAnalyze(true) // Mark as analyzed
    } else if (step3Data?.advancedAnalysis) {
      // Load advanced analysis from cache
      console.log('[Stage 3] ✅ Loading advanced analysis from cache (step3Data)')
      setAdvancedAnalysis(step3Data.advancedAnalysis)
      setAnalysisMode('advanced')
      setAnalysisTime(step3Data.analysisTime)
      setSelectedFormat(step3Data.selectedFormat || 'news')
    } else if (step3Data?.scenes && step3Data?.overallScore !== undefined) {
      // Load simple analysis from cache (legacy)
      console.log('[Stage 3] ✅ Loading simple analysis from cache (step3Data)')
      setAnalysis({
        format: step3Data.selectedFormat || 'news',
        overallScore: step3Data.overallScore,
        overallComment: step3Data.overallComment || '',
        scenes: step3Data.scenes
      })
      setAnalysisMode('simple')
      setSelectedFormat(step3Data.selectedFormat || 'news')
      setSelectedVariants(step3Data.selectedVariants || {})
      setEditedScenes(step3Data.editedScenes || {})
      setVariantScores(step3Data.variantScores || {})
    } else {
      console.log('[Stage 3] ℹ️ No cached analysis found - user must click "Analyze Content"')
    }
    // ❌ REMOVED AUTOMATIC ANALYSIS TRIGGER!
    // User must click "Start Analysis" button if no cache exists
    // This prevents unnecessary API calls every time project is opened
  }, [step3Data, projectId])
}
