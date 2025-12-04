import { useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/query-client"
import { type Project } from "@shared/schema"

// Determine which advanced endpoint to use based on sourceType
const getAdvancedEndpoint = (sourceType: string) => {
  switch (sourceType) {
    case 'news':
      return '/api/analyze/advanced/news'
    case 'instagram':
      return '/api/analyze/advanced/reel'
    case 'custom':
    default:
      return '/api/analyze/advanced/script'
  }
}

// Prepare request body for advanced analysis
const getAdvancedRequestBody = (project: Project, stepData: any, content: string, selectedFormat: string) => {
  switch (project.sourceType) {
    case 'news':
      return {
        title: stepData?.title || project.title || 'Untitled',
        content: stepData?.content || content
      }
    case 'instagram':
      return {
        transcription: stepData?.transcription || content,
        caption: stepData?.caption || null
      }
    case 'custom':
    default:
      return {
        text: stepData?.text || content,
        format: selectedFormat || 'short-form',
        scenes: stepData?.scenes || null
      }
  }
}

export function useAdvancedAnalysis(
  project: Project,
  stepData: any,
  content: string,
  selectedFormat: string,
  setAdvancedAnalysis: (analysis: any) => void,
  setAnalysisTime: (time: number | undefined) => void
) {
  // Advanced analysis mutation
  const advancedAnalyzeMutation = useMutation({
    mutationFn: async () => {
      const endpoint = getAdvancedEndpoint(project.sourceType)
      const body = getAdvancedRequestBody(project, stepData, content, selectedFormat)

      const res = await apiRequest("POST", endpoint, body)
      return await res.json()
    },
    onSuccess: (data) => {
      setAdvancedAnalysis(data)
      setAnalysisTime(data.metadata?.analysisTime)

      // Save to cache
      apiRequest("POST", `/api/projects/${project.id}/steps`, {
        stepNumber: 3,
        data: {
          analysisMode: 'advanced',
          advancedAnalysis: data,
          analysisTime: data.metadata?.analysisTime,
          selectedFormat
        }
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "steps"] })
      }).catch(err => {
        console.error("Failed to cache advanced analysis:", err)
      })

      // Create initial script version if scenes exist
      if (data.scenes && data.scenes.length > 0) {
        apiRequest("POST", `/api/projects/${project.id}/create-initial-version`, {
          scenes: data.scenes,
          analysisResult: data,
          analysisScore: data.overallScore
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "script-history"], exact: false })
          queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "scene-recommendations"], exact: false })
        }).catch(err => {
          console.error("Failed to create initial version:", err)
        })
      }
    },
  })

  return { advancedAnalyzeMutation }
}
