import { useMutation } from "@tanstack/react-query"
import { useToast } from "@/shared/hooks"
import { queryClient } from "@/shared/api"
import { projectsService } from "../services"

/**
 * Hook for project mutations (create, update, delete, restore, rename)
 */
export function useProjectMutations() {
  const { toast } = useToast()

  const deleteMutation = useMutation({
    mutationFn: (projectId: string) => projectsService.delete(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] })
      toast({
        title: "Project Deleted",
        description: "Project has been moved to deleted. Can be restored within 7 days.",
      })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete project",
      })
    }
  })

  const renameMutation = useMutation({
    mutationFn: ({ projectId, title }: { projectId: string, title: string }) =>
      projectsService.rename(projectId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] })
      toast({
        title: "Project Renamed",
        description: "Project name has been updated successfully.",
      })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to rename project",
      })
    }
  })

  const restoreMutation = useMutation({
    mutationFn: (projectId: string) => projectsService.restore(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] })
      toast({
        title: "Project Restored",
        description: "Project has been restored to drafts.",
      })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to restore project",
      })
    }
  })

  const permanentDeleteMutation = useMutation({
    mutationFn: (projectId: string) => projectsService.permanentDelete(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] })
      toast({
        title: "Project Deleted Permanently",
        description: "Project has been permanently deleted from the database.",
      })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete project permanently",
      })
    }
  })

  return {
    deleteMutation,
    renameMutation,
    restoreMutation,
    permanentDeleteMutation,
  }
}
