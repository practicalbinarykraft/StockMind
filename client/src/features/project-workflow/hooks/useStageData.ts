import { useWorkflowStore, selectProject, selectGetStepData } from '../store/workflowStore'
import { type Project } from '@shared/schema'

/**
 * Hook for stages to access their data from store
 * Usage: const { project, getStepData } = useStageData()
 */
export function useStageData() {
  const project = useWorkflowStore(selectProject)
  const getStepData = useWorkflowStore(selectGetStepData)

  return {
    project: project as Project, // Assert non-null since stages only render when project exists
    getStepData,
  }
}
