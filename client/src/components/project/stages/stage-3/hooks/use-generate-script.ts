import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/query-client"
import { useToast } from "@/hooks/use-toast"

export function useGenerateScript(
  projectId: string,
  targetLanguage: 'ru' | 'en',
  scriptVersionsQuery: any,
  setRecoveryError: (error: any) => void,
  setFailedFormatId: (id: string | null) => void,
  setRecoveryModalOpen: (open: boolean) => void
) {
  const { toast } = useToast()

  // Generate script mutation (for source review mode) - calls new unified endpoint
  const generateMutation = useMutation({
    mutationFn: async (formatId: string) => {
      // Generate idempotency key to prevent double-click issues
      const idempotencyKey = `${projectId}:${formatId}:${Date.now()}`

      const res = await apiRequest("POST", `/api/projects/${projectId}/generate-script`, {
        formatId,
        targetLocale: targetLanguage, // Use selected language
        idempotencyKey
      })
      const response = await res.json()
      // Unwrap response: { success: true, data: {...} }
      return response.data || response
    },
    onSuccess: async (data) => {
      // Invalidate and immediately refetch to trigger UI switch (exact: false to match all variants)
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "script-history"], exact: false })
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "scene-recommendations"], exact: false })
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId], exact: false })

      // Force immediate refetch to update hasScript state
      await scriptVersionsQuery.refetch()

      // Auto-scroll to scene editor after short delay
      setTimeout(() => {
        const sceneEditor = document.querySelector('[data-testid="scene-editor"]')
        if (sceneEditor) {
          sceneEditor.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 300)

      // Use scenesCount from response data, or try to get from version
      const scenesCount = data.data?.scenesCount || data.scenesCount || data.version?.scenes?.length || 0
      toast({
        title: "Сценарий создан",
        description: `Создано ${scenesCount} сцен • Формат: ${data.data?.formatName || data.formatName || 'Hook & Story'}. Редактор сцен загружается...`,
      })
    },
    onError: async (error: any, formatId: string) => {
      console.error('[Generate Script Error]:', error)

      // Try to parse JSON from error message (format: "422: {json}")
      let errorData: any = null
      try {
        const match = error.message?.match(/^\d+:\s*(\{[\s\S]*\})$/)
        if (match) {
          errorData = JSON.parse(match[1])
        }
      } catch (e) {
        console.warn('[Generate Script] Could not parse error JSON:', e)
      }

      // Check if this is a NO_SCENES error (422)
      const isNoScenesError =
        errorData?.code === 'NO_SCENES' ||
        error.message?.includes('NO_SCENES') ||
        error.message?.includes('не смог создать сцен') ||
        error.message?.includes('422')

      if (isNoScenesError) {
        console.log('[Generate Script] NO_SCENES error detected, showing Recovery modal')
        // Show Recovery modal with structured data
        setRecoveryError({
          message: errorData?.message || error.message || 'AI не смог создать сценарий',
          suggestions: errorData?.suggestions || [
            'Попробуйте другой формат видео',
            'Повторите попытку',
          ],
          code: 'NO_SCENES',
        })
        setFailedFormatId(formatId)
        setRecoveryModalOpen(true)
        return
      }

      // Default error handling for other errors
      toast({
        title: "Ошибка генерации",
        description: error.message || "Не удалось создать скрипт",
        variant: "destructive"
      })
    }
  })

  // Handle generate script (for source review mode)
  const handleGenerateScript = (formatId: string) => {
    generateMutation.mutate(formatId)
  }

  return { generateMutation, handleGenerateScript }
}
