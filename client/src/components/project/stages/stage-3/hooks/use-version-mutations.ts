import { useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/query-client"
import { useToast } from "@/hooks/use-toast"

export function useVersionMutations(projectId: string) {
  const { toast } = useToast()

  // Accept candidate version mutation
  const acceptMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const res = await apiRequest('PUT', `/api/projects/${projectId}/versions/${versionId}/accept`, {})
      const response = await res.json()
      return response.data || response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'script-history'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'scene-recommendations'], exact: false })
      toast({
        title: "Версия принята",
        description: "Новая версия теперь текущая",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка принятия",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  // Reject (delete) candidate version mutation
  const rejectMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const res = await apiRequest('DELETE', `/api/projects/${projectId}/versions/${versionId}`, {})
      const response = await res.json()
      return response.data || response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'script-history'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'scene-recommendations'], exact: false })
      toast({
        title: "Версия отклонена",
        description: "Кандидат удалён",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка удаления",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  return { acceptMutation, rejectMutation }
}
