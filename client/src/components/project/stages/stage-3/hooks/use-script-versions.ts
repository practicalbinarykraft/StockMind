import { useQuery } from "@tanstack/react-query"
import { type Project } from "@shared/schema"
import { apiRequest, getQueryFn } from "@/lib/query-client"

export function useScriptVersions(project: Project) {
  const scriptVersionsQuery = useQuery({
    queryKey: ['/api/projects', project.id, 'script-history'],
    queryFn: getQueryFn<any>({ on401: "returnNull" }),
    enabled: Boolean(project.id), // Always enabled if we have project ID
    staleTime: 5000,
    retry: false, // Don't retry on 401
  })

  // Detect if script exists - check both currentVersion and versions array
  // Handle both unwrapped data (from apiRequest) and wrapped data (from getQueryFn)
  const data = scriptVersionsQuery.data?.data || scriptVersionsQuery.data
  const hasScript = Boolean(
    data?.currentVersion ||
    (data?.versions && data.versions.length > 0)
  )

  // Check if there's a candidate version for comparison
  // API returns camelCase (isCandidate) after Drizzle ORM transformation
  const versions = data?.versions || []
  const hasCandidate = versions.some((v: any) =>
    v.isCandidate === true || v.is_candidate === true
  )

  // Extract current and candidate version IDs for new compare endpoint
  const currentVersion = data?.currentVersion
  const candidateVersion = versions.find((v: any) =>
    v.isCandidate === true || v.is_candidate === true
  )

  return {
    scriptVersionsQuery,
    hasScript,
    hasCandidate,
    currentVersion,
    candidateVersion,
    versions
  }
}
