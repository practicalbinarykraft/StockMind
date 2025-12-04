import { type Project } from "@shared/schema"

export interface Stage4Props {
  project: Project
  stepData: any
}

export interface Voice {
  voice_id: string
  name: string
  category?: string
  labels?: Record<string, string>
  description?: string
  preview_url?: string
}

export interface Stage4StepData {
  mode: "generate" | "upload"
  finalScript?: string
  selectedVoice?: string
  audioUrl?: string
  filename?: string
  filesize?: number
  versionId?: number
}

export interface ScriptVersion {
  id: number
  scenes: Array<{ text: string }>
  isCandidate?: boolean
  is_candidate?: boolean
}

export interface ScriptData {
  currentVersion?: ScriptVersion
  versions?: ScriptVersion[]
}

export interface VoiceSettings {
  stability: number
  similarity_boost: number
}
