import { useRef, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/query-client"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"

export function useReanalysisMutation(
  projectId: string,
  setReanalyzeJobId: (id: string | null) => void,
  setJobStatus: (status: any) => void,
  setCompareOpen: (open: boolean) => void
) {
  const { toast } = useToast()

  // Store polling timers for cleanup
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Store last submitted scenes/fullScript for retries
  const lastSubmittedPayload = useRef<{ scenes: any[]; fullScript: string } | null>(null)

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
      if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current)
    }
  }, [])

  // Reanalyze mutation - starts async job (saves new version + auto-analyze)
  const reanalyzeMutation = useMutation({
    mutationFn: async ({ scenes, fullScript }: { scenes: any[]; fullScript: string }) => {
      // Save payload for retries (both in-memory and localStorage)
      lastSubmittedPayload.current = { scenes, fullScript }
      localStorage.setItem('reanalyzePayload', JSON.stringify({ scenes, fullScript }))
      localStorage.setItem('reanalyzePayloadProjectId', projectId)

      const idempotencyKey = `version-${projectId}-${Date.now()}`

      const res = await apiRequest('POST', `/api/projects/${projectId}/versions`, {
        scenes,
        fullScript,
        idempotencyKey
      })

      // Handle 409 - job already running
      if (res.status === 409) {
        const json = await res.json()
        // Return the existing job info so we can resume polling
        return { jobId: json.jobId, alreadyRunning: true }
      }

      const json = await res.json()
      const data = json?.data ?? json
      return data
    },
    onSuccess: (data: any) => {
      const jobId = data.jobId
      setReanalyzeJobId(jobId)
      setJobStatus({ status: 'queued', progress: 0 })

      // CRITICAL: Invalidate cache IMMEDIATELY after candidate created
      // Don't wait for analysis to complete - user should see their edits right away
      // exact: false to match all activeVersionId variants
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'script-history'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'scene-recommendations'], exact: false })

      if (data.alreadyRunning) {
        toast({
          title: "Версия уже создаётся",
          description: "Продолжаем отслеживать прогресс",
        })
      } else {
        toast({
          title: "Создаём новую версию",
          description: "Создаём версию… ~10–60 сек",
        })
      }

      // Save jobId to localStorage for recovery
      localStorage.setItem('reanalyzeJobId', jobId)
      localStorage.setItem('reanalyzeProjectId', projectId)

      // Auto-open compare modal to show progress
      setCompareOpen(true)

      // Clear any existing polling timers
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
      if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current)

      // Start polling
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/projects/${projectId}/reanalyze/status?jobId=${jobId}`)
          const json = await res.json()
          const status = json?.data ?? json

          setJobStatus(status)

          if (status.status === 'done') {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
            if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current)
            setReanalyzeJobId(null)
            setJobStatus(null)
            localStorage.removeItem('reanalyzeJobId')
            localStorage.removeItem('reanalyzeProjectId')
            localStorage.removeItem('reanalyzePayload')
            localStorage.removeItem('reanalyzePayloadProjectId')

            toast({
              title: "Новая версия готова",
              description: "Теперь можно открыть сравнение",
              action: (
                <ToastAction altText="Открыть сравнение" onClick={() => setCompareOpen(true)}>
                  Открыть
                </ToastAction>
              )
            })
            queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'script-history'], exact: false })
          } else if (status.status === 'error') {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
            if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current)
            setReanalyzeJobId(null)
            localStorage.removeItem('reanalyzeJobId')
            localStorage.removeItem('reanalyzeProjectId')

            toast({
              title: "Ошибка анализа",
              description: status.error || "Произошла ошибка",
              variant: "destructive"
            })
          }
        } catch (err) {
          console.error('[Reanalyze] Polling error:', err)
        }
      }, 2000) // Poll every 2s

      // No hard timeout - poll until job reaches final status (done/error)
      // The server has a 120-second timeout that will set status to 'error' if exceeded
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка запуска анализа",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  return { reanalyzeMutation, lastSubmittedPayload }
}
