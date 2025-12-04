import { useQuery, useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/query-client"
import { useToast } from "@/hooks/use-toast"
import type { EnrichedProject, ProjectsWithScriptsData } from "../types"

export function useProjects() {
  const { toast } = useToast()

  // Single query with include param - fetches all data in one request
  // This eliminates N+1 queries (was: 1 + N*2 calls, now: 1 call)
  const { data: enrichedProjects, isLoading } = useQuery<EnrichedProject[]>({
    queryKey: ["/api/projects", "include=steps,currentVersion"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/projects?include=steps,currentVersion")
      if (!res.ok) throw new Error("Failed to fetch projects")
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  // Transform enriched data to maintain backwards compatibility
  const projects = enrichedProjects

  const projectsWithScripts: ProjectsWithScriptsData | undefined = enrichedProjects
    ? {
        steps: enrichedProjects.reduce((acc, p) => {
          acc[p.id] = p.steps || []
          return acc
        }, {} as Record<string, any[]>),
        versions: enrichedProjects.reduce((acc, p) => {
          acc[p.id] = p.currentVersion || null
          return acc
        }, {} as Record<string, any>),
      }
    : undefined

  const deleteMutation = useMutation({
    mutationFn: async (projectId: string) => {
      return await apiRequest("DELETE", `/api/projects/${projectId}`)
    },
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
    mutationFn: async ({ projectId, title }: { projectId: string, title: string }) => {
      return await apiRequest("PATCH", `/api/projects/${projectId}`, { title })
    },
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
    mutationFn: async (projectId: string) => {
      return await apiRequest("PATCH", `/api/projects/${projectId}`, {
        status: 'draft',
        deletedAt: null
      })
    },
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
    mutationFn: async (projectId: string) => {
      return await apiRequest("DELETE", `/api/projects/${projectId}/permanent`)
    },
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
    projects,
    projectsWithScripts,
    isLoading,
    deleteMutation,
    renameMutation,
    restoreMutation,
    permanentDeleteMutation,
  }
}
