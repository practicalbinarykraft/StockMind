import { useWorkflowStore, selectCurrentStage, selectProject } from '../store/workflowStore'
import { useMutation } from '@tanstack/react-query'
import { workflowService } from '../services/workflowService'
import { queryClient } from '@/shared/api'

/**
 * Navigation hook for workflow stages
 * Stages use this for navigation, not direct API calls
 */
export function useWorkflowNavigation() {
  const currentStage = useWorkflowStore(selectCurrentStage)
  const project = useWorkflowStore(selectProject)
  const projectId = project?.id

  // Mutation to navigate to next stage
  const goToNextStageMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('No project ID')
      const nextStage = currentStage + 1
      return workflowService.updateStage(projectId, nextStage)
    },
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] })
      }
    },
  })

  // Mutation to navigate to previous stage
  const goToPreviousStageMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('No project ID')
      const previousStage = Math.max(1, currentStage - 1)
      return workflowService.updateStage(projectId, previousStage)
    },
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] })
      }
    },
  })

  // Navigate to specific stage
  const goToStageMutation = useMutation({
    mutationFn: async (stage: number) => {
      if (!projectId) throw new Error('No project ID')
      return workflowService.updateStage(projectId, stage)
    },
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] })
      }
    },
  })

  const canGoNext = currentStage < 8
  const canGoPrevious = currentStage > 1

  return {
    currentStage,
    canGoNext,
    canGoPrevious,
    goToNextStage: goToNextStageMutation.mutate,
    goToPreviousStage: goToPreviousStageMutation.mutate,
    goToStage: goToStageMutation.mutate,
    isNavigating: goToNextStageMutation.isPending || goToPreviousStageMutation.isPending || goToStageMutation.isPending,
  }
}
