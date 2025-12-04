import type { Project } from "@shared/schema"

export type FilterType = "all" | "draft" | "completed" | "deleted"
export type ViewMode = "grid" | "list"
export type SortBy = "updated" | "title" | "progress" | "created"

export interface ProjectWithScripts extends Project {
  step3Data?: any
  currentScriptVersion?: any
}

export interface ProjectsWithScriptsData {
  steps: Record<string, any[]>
  versions: Record<string, any>
}

export interface DialogState {
  deleteDialogOpen: boolean
  permanentDeleteDialogOpen: boolean
  renameDialogOpen: boolean
  selectedProject: Project | null
  newTitle: string
}
