import { create } from 'zustand'
import { type Project, type ProjectStep } from '@shared/schema'

interface WorkflowState {
  // Data
  project: Project | null
  steps: ProjectStep[]
  currentStage: number
  isLoading: boolean
  error: string | null
  
  // Actions - Data Management
  setProject: (project: Project | null) => void
  setSteps: (steps: ProjectStep[]) => void
  setStage: (stage: number) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  
  // Computed - Get step data by step number
  getStepData: (stepNumber: number) => any
  
  // Reset
  reset: () => void
}

const initialState = {
  project: null,
  steps: [],
  currentStage: 1,
  isLoading: false,
  error: null,
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  ...initialState,
  
  // Data setters
  setProject: (project) => set({ 
    project,
    currentStage: project?.currentStage || 1 
  }),
  
  setSteps: (steps) => set({ steps }),
  
  setStage: (stage) => set({ currentStage: stage }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  // Get step data helper
  getStepData: (stepNumber: number) => {
    const state = get()
    const step = state.steps.find((s) => s.stepNumber === stepNumber)
    return step?.data
  },
  
  // Reset all state
  reset: () => set(initialState),
}))

// Selectors for better performance
export const selectProject = (state: WorkflowState) => state.project
export const selectSteps = (state: WorkflowState) => state.steps
export const selectCurrentStage = (state: WorkflowState) => state.currentStage
export const selectIsLoading = (state: WorkflowState) => state.isLoading
export const selectError = (state: WorkflowState) => state.error
export const selectGetStepData = (state: WorkflowState) => state.getStepData
