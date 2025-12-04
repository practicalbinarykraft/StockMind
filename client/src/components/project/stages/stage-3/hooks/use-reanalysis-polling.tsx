import { useEffect, MutableRefObject } from "react"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { queryClient } from "@/lib/query-client"

export function useReanalysisPolling(
  projectId: string,
  reanalyzeJobId: string | null,
  setReanalyzeJobId: (id: string | null) => void,
  setJobStatus: (status: any) => void,
  setCompareOpen: (open: boolean) => void,
  lastSubmittedPayload: MutableRefObject<{ scenes: any[]; fullScript: string } | null>
) {
  const { toast } = useToast()

  // Restore polling after page reload
  useEffect(() => {
    const savedJobId = localStorage.getItem('reanalyzeJobId')
    const savedProjectId = localStorage.getItem('reanalyzeProjectId')
    const savedPayload = localStorage.getItem('reanalyzePayload')
    const savedPayloadProjectId = localStorage.getItem('reanalyzePayloadProjectId')

    // Restore payload if it matches current project
    if (savedPayload && savedPayloadProjectId === projectId) {
      try {
        lastSubmittedPayload.current = JSON.parse(savedPayload)
      } catch (err) {
        console.error('[Reanalyze] Failed to restore payload:', err)
      }
    }

    if (savedJobId && savedProjectId === projectId && !reanalyzeJobId) {
      console.log('[Reanalyze] Восстанавливаем поллинг для job:', savedJobId)
      setReanalyzeJobId(savedJobId)
      setJobStatus({ status: 'running', progress: 50 })

      // Resume polling
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/projects/${projectId}/reanalyze/status?jobId=${savedJobId}`)
          const json = await res.json()
          const status = json?.data ?? json

          setJobStatus(status)

          if (status.status === 'done') {
            clearInterval(interval)
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
            clearInterval(interval)
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
      }, 2000)

      // No hard timeout - poll until job reaches final status (done/error)
      // The server has a 120-second timeout that will set status to 'error' if exceeded

      // Cleanup on unmount
      return () => {
        clearInterval(interval)
      }
    }
  }, [projectId, reanalyzeJobId])
}
