import { useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/query-client"
import { useToast } from "@/hooks/use-toast"
import { type AIAnalysis } from "../types/analysis-types"

export function useLegacyAnalysis(
  projectId: string,
  content: string,
  setAnalysis: (analysis: AIAnalysis | null) => void,
  setSelectedFormat: (format: string) => void,
  setVariantScores: (scores: Record<string, number>) => void,
  setScoringVariant: (variant: string | null) => void
) {
  const { toast } = useToast()

  // Simple/legacy analysis mutation (kept for backward compatibility)
  const analyzeMutation = useMutation({
    mutationFn: async (format: string) => {
      const res = await apiRequest("POST", "/api/ai/analyze-script", { format, content })
      return await res.json()
    },
    onSuccess: (data) => {
      setAnalysis(data)
      setSelectedFormat(data.format)

      // Save to cache immediately with fresh data (don't rely on state!)
      apiRequest("POST", `/api/projects/${projectId}/steps`, {
        stepNumber: 3,
        data: {
          analysisMode: 'simple',
          selectedFormat: data.format,
          selectedVariants: {},
          editedScenes: {},
          overallScore: data.overallScore,
          overallComment: data.overallComment,
          scenes: data.scenes
        }
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "steps"] })
      }).catch(err => {
        console.error("Failed to cache analysis:", err)
      })
    },
    onError: (error: any) => {
      // apiRequest throws Error with message format: "404: text" or "500: text"
      const statusMatch = error?.message?.match(/^(\d{3}):/)
      const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : null
      const is404 = statusCode === 404 || error?.status === 404

      toast({
        title: 'Ошибка анализа',
        description: is404
          ? 'Legacy-анализ недоступен. Используйте Advanced Analyze для более детального анализа скрипта.'
          : error.message || 'Не удалось выполнить анализ скрипта',
        variant: 'destructive',
      })
    },
  })

  // Score variant mutation
  const scoreVariantMutation = useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      const res = await apiRequest("POST", "/api/ai/score-text", { text })
      return await res.json()
    },
  })

  return { analyzeMutation, scoreVariantMutation }
}
