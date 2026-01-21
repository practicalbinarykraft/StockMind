export interface WorkflowStage {
  id: number
  name: string
  description: string
  isCompleted: boolean
  isAccessible: boolean
}

export interface StageData {
  stepNumber: number
  data: any
  completedAt?: string
}

export type SourceType = 'news' | 'instagram' | 'custom'

export interface GenerateScriptData {
  type: SourceType
  content?: string
  newsId?: string
  instagramItemId?: string
}
