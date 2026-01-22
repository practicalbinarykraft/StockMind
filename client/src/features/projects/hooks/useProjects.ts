import { useQuery } from "@tanstack/react-query"
import { projectsService } from "../services"
import { EnrichedProject, ProjectsWithScriptsData } from "../types"

/**
 * Hook to fetch all projects with enriched data
 * Returns projects with steps and currentVersion included
 */
export function useProjects() {
  // Single query with include param - fetches all data in one request
  // This eliminates N+1 queries (was: 1 + N*2 calls, now: 1 call)
  const { data: enrichedProjects, isLoading, error } = useQuery<EnrichedProject[]>({
    queryKey: ["/api/projects", "include=steps,currentVersion"],
    queryFn: () => projectsService.getAll(["steps", "currentVersion"]),
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

  return {
    projects,
    projectsWithScripts,
    isLoading,
    error,
  }
}
