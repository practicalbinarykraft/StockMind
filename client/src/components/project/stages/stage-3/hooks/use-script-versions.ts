import { useQuery } from "@tanstack/react-query"
import { type Project } from "@shared/schema"

export function useScriptVersions(project: Project) {
  const scriptVersionsQuery = useQuery({
    queryKey: ['/api/projects', project.id, 'script-history'],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${project.id}/script-history`)
      if (!res.ok) return { currentVersion: null, versions: [], recommendations: [] }
      const response = await res.json()
      // Unwrap new API format: { success: true, data: {...} }
      return response.data || response
    },
    enabled: Boolean(project.id), // Always enabled if we have project ID
    staleTime: 5000
  })

  // Detect if script exists - check both currentVersion and versions array
  const hasScript = Boolean(
    scriptVersionsQuery.data?.currentVersion ||
    (scriptVersionsQuery.data?.versions && scriptVersionsQuery.data.versions.length > 0)
  )

  // Check if there's a candidate version for comparison
  // API returns camelCase (isCandidate) after Drizzle ORM transformation
  const versions = scriptVersionsQuery.data?.versions || []
  const hasCandidate = versions.some((v: any) =>
    v.isCandidate === true || v.is_candidate === true
  )

  // Extract current and candidate version IDs for new compare endpoint
  const currentVersion = scriptVersionsQuery.data?.currentVersion
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
