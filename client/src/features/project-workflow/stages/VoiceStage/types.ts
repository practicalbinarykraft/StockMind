/**
 * VoiceStage types
 * Централизованные типы для Stage 4 (Voice Generation)
 */

// ============================================================================
// Voice Types
// ============================================================================

export interface Voice {
  voice_id: string
  name: string
  category?: string
  labels?: Record<string, string>
  description?: string
  preview_url?: string
}

export interface VoiceSettings {
  stability: number
  similarity_boost: number
}

// ============================================================================
// Step Data Types
// ============================================================================

export interface Stage4StepData {
  mode: "generate" | "upload"
  finalScript?: string
  selectedVoice?: string
  audioUrl?: string
  filename?: string
  filesize?: number
}

// ============================================================================
// Hook Types
// ============================================================================

export interface UseVoiceGenerationProps {
  finalScript: string
  selectedVoice: string
  activeVersion: undefined
  onAudioGenerated: (audioUrl: string) => void
}

export interface UseVoiceGenerationReturn {
  audioData: string | null
  isPlaying: boolean
  previewingVoice: string | null
  generateMutation: any
  audioRef: React.RefObject<HTMLAudioElement | null>
  handleGenerate: () => void
  handlePlayPause: () => void
  handlePreview: (voiceId: string, previewUrl?: string) => void
  handleDownload: (serverAudioUrl: string | null) => void
  setIsPlaying: (playing: boolean) => void
}

export interface UseStage4DataReturn {
  // Script data
  finalScript: string
  setFinalScript: (script: string) => void
  initialScript: string
  setInitialScript: (script: string) => void
  savedScript: string
  activeVersion: undefined

  // Mode
  mode: "generate" | "upload"
  setMode: (mode: "generate" | "upload") => void

  // Voice data
  voices: Voice[] | undefined
  voicesLoading: boolean
  voicesError: Error | null
  selectedVoice: string
  setSelectedVoice: (voiceId: string) => void
  myVoices: Voice[]
  publicVoices: Voice[]

  // Stage 4 step data
  stage4Data: any
  isStepSkipped: boolean
  isStepCompleted: boolean

  // Audio URLs
  serverAudioUrl: string | null
  setServerAudioUrl: (url: string | null) => void
}

export interface UseAudioUploadProps {
  onUploadSuccess: (audioUrl: string) => void
}

export interface UseAudioUploadReturn {
  uploadedFile: File | null
  uploadedAudioUrl: string | null
  isDragging: boolean
  isUploadPlaying: boolean
  uploadMutation: any
  uploadAudioRef: React.RefObject<HTMLAudioElement | null>
  fileInputRef: React.RefObject<HTMLInputElement | null>
  handleFileSelect: (file: File) => void
  handleDragOver: (e: React.DragEvent) => void
  handleDragLeave: (e: React.DragEvent) => void
  handleDrop: (e: React.DragEvent) => void
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleUploadPlayPause: () => void
  handleUploadDownload: (stage4Filename?: string) => void
  setUploadedFile: (file: File | null) => void
  setUploadedAudioUrl: (url: string | null) => void
  setIsUploadPlaying: (playing: boolean) => void
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface VoiceSelectorProps {
  voices: Voice[] | undefined
  voicesLoading: boolean
  voicesError: Error | null
  selectedVoice: string
  previewingVoice: string | null
  myVoices: Voice[]
  publicVoices: Voice[]
  onVoiceSelect: (voiceId: string) => void
  onPreview: (voiceId: string, previewUrl?: string) => void
}

export interface ScriptEditorProps {
  value: string
  onChange: (value: string) => void
  initialScript?: string
  savedScript?: string
  onSave?: (script: string) => Promise<void>
  isSaving?: boolean
}

export interface AudioPlayerProps {
  audioUrl: string | null
  audioData: string | null
  isPlaying: boolean
  voiceName?: string
  onPlayPause: () => void
  onDownload: () => void
  onEnded: () => void
}

export interface AudioUploaderProps {
  uploadedFile: File | null
  uploadedAudioUrl: string | null
  savedFilename?: string
  savedFilesize?: number
  isDragging: boolean
  isUploadPlaying: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  uploadAudioRef: React.RefObject<HTMLAudioElement | null>
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onUploadPlayPause: () => void
  onUploadDownload: () => void
  setUploadedFile: (file: File | null) => void
}
