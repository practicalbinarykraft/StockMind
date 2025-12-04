import { useQuery, useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/query-client"
import { useToast } from "@/hooks/use-toast"
import type { Project } from "@shared/schema"
import type { ProjectsWithScriptsData } from "../types"

export function useProjects() {
  const { toast } = useToast()

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  })

  const { data: projectsWithScripts } = useQuery<ProjectsWithScriptsData>({
    queryKey: ["/api/projects", "with-scripts"],
    queryFn: async () => {
      if (!projects) return { steps: {}, versions: {} }

      const stepsPromises = projects.map(async (project) => {
        try {
          const res = await apiRequest("GET", `/api/projects/${project.id}/steps`)
          if (!res.ok) return { projectId: project.id, steps: [] }
          const steps = await res.json()
          return { projectId: project.id, steps }
        } catch {
          return { projectId: project.id, steps: [] }
        }
      })

      const versionsPromises = projects.map(async (project) => {
        try {
          const res = await apiRequest("GET", `/api/projects/${project.id}/script-versions`)
          if (!res.ok) return { projectId: project.id, currentVersion: null }
          const data = await res.json()
          const currentVersion = data.versions?.find((v: any) => v.isCurrent) || data.versions?.[0] || null
          return { projectId: project.id, currentVersion }
        } catch {
          return { projectId: project.id, currentVersion: null }
        }
      })

      const [stepsResults, versionsResults] = await Promise.all([
        Promise.all(stepsPromises),
        Promise.all(versionsPromises)
      ])

      return {
        steps: stepsResults.reduce((acc, { projectId, steps }) => {
          acc[projectId] = steps
          return acc
        }, {} as Record<string, any[]>),
        versions: versionsResults.reduce((acc, { projectId, currentVersion }) => {
          acc[projectId] = currentVersion
          return acc
        }, {} as Record<string, any>)
      }
    },
    enabled: !!projects && projects.length > 0,
    staleTime: 5 * 60 * 1000,
  })

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
