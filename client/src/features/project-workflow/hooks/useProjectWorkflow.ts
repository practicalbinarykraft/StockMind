import { useQuery, useMutation } from '@tanstack/react-query'
import { queryClient } from '@/shared/api'
import { workflowService } from '../services/workflowService'
import { useWorkflowStore } from '../store/workflowStore'
import { useEffect } from 'react'

/**
 * Main workflow hook - syncs React Query with Zustand store
 * Stages should NOT use this directly, only read from store
 */
export function useProjectWorkflow(projectId: string) {
  const { setProject, setSteps, setLoading, setError } = useWorkflowStore()

  // Query project data
  const { data: project, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: ['/api/projects', projectId],
    queryFn: () => workflowService.getProject(projectId),
    enabled: !!projectId,
  })

  // Query project steps
  const { data: steps, isLoading: stepsLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'steps'],
    enabled: !!projectId,
  })

  // Sync project data to store
  useEffect(() => {
    if (project) {
      setProject(project)
    }
  }, [project, setProject])

  // Sync steps data to store
  useEffect(() => {
    if (steps) {
      setSteps(Array.isArray(steps) ? steps : [])
    }
  }, [steps, setSteps])

  // Sync loading state to store
  useEffect(() => {
    setLoading(projectLoading || stepsLoading)
  }, [projectLoading, stepsLoading, setLoading])

  // Sync error state to store
  useEffect(() => {
    setError(projectError?.message || null)
  }, [projectError, setError])

  // Mutation to update stage
  const updateStageMutation = useMutation({
    mutationFn: (stage: number) => workflowService.updateStage(projectId, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] })
    },
  })

  // Mutation to complete project
  const completeProjectMutation = useMutation({
    mutationFn: () => workflowService.completeProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] })
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] })
    },
  })

  return {
    // These are for initial setup only, stages should read from store
    isReady: !projectLoading && !stepsLoading && !!project,
    updateStage: updateStageMutation.mutate,
    completeProject: completeProjectMutation.mutate,
    isUpdatingStage: updateStageMutation.isPending,
    isCompletingProject: completeProjectMutation.isPending,
  }
}
