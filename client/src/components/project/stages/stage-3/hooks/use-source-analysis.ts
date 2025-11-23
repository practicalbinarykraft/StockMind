import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/lib/query-client"
import { type Project } from "@shared/schema"

export function useSourceAnalysis(project: Project, hasScript: boolean, content: string, stepData: any) {
  // State for manual analysis trigger
  const [shouldAnalyze, setShouldAnalyze] = useState(false)

  // Query for source analysis (only in source review mode - MANUAL TRIGGER)
  const sourceAnalysisQuery = useQuery({
    queryKey: ['/api/projects', project.id, 'analyze-source'],
    queryFn: async () => {
      const res = await apiRequest('POST', `/api/projects/${project.id}/analyze-source`, {})
      const response = await res.json()
      // Unwrap new API format: { success: true, data: {...} }
      return response.data || response
    },
    enabled: !hasScript && shouldAnalyze && Boolean(project.id),
    staleTime: Infinity
  })

  // Manual trigger for source analysis
  const handleStartAnalysis = () => {
    setShouldAnalyze(true)
  }

  // Source data extraction for source review mode
  const sourceData = {
    type: project.sourceType as 'news' | 'instagram' | 'custom',
    score: stepData?.aiScore,
    language: sourceAnalysisQuery.data?.sourceMetadata?.language || 'unknown',
    wordCount: content.split(/\s+/).filter(Boolean).length,
    title: stepData?.title || project.title || 'Untitled',
    content: content
  }

  return {
    shouldAnalyze,
    setShouldAnalyze,
    sourceAnalysisQuery,
    handleStartAnalysis,
    sourceData
  }
}
