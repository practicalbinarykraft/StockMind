/**
 * Типы для конвейера
 */

// === NEWS ===

export interface NewsItem {
  id: string
  title: string
  content: string | null
  fullContent: string | null
  source: string | null
  sourceUrl: string | null
  url: string | null
  imageUrl: string | null
  aiScore: number | null
  aiComment: string | null
  status: 'new' | 'scored' | 'selected' | 'used' | 'dismissed'
  publishedAt: string | null
  createdAt: string
  updatedAt: string | null
}

export interface RssSource {
  id: string
  name: string
  url: string
  isActive: boolean
  lastFetchedAt: string | null
  createdAt: string
}

// === SCRIPTS ===

export interface Script {
  id: string
  newsId: string
  newsTitle: string
  scenes: Scene[]
  createdAt: string
  updatedAt: string
  status: 'draft' | 'review' | 'completed'
  sourceType: 'rss' | 'instagram'
  sourceName: string
  score: number
  hasAudio: boolean
  hasAvatar: boolean
}

export interface Scene {
  id: string
  order: number
  text: string
  alternatives: string[]
  // Pipeline fields
  visualSource?: string | null
  mediaType?: 'image' | 'video'
  audioUrl?: string
  durationInFrames?: number // длительность в кадрах (fps=30)
  imagePrompt?: string // промпт для генерации визуала
  textPosition?: 'top' | 'center' | 'bottom' | 'none'
  fontSize?: number
  textAlign?: 'left' | 'center' | 'right'
  textColor?: string
  textAnimation?: 'none' | 'fade' | 'slide-up' | 'scale' | 'typewriter' | 'word-by-word'
  mediaAnimation?: 'none' | 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right'
  isGenerating?: boolean // флаг генерации
}

// === STATISTICS ===

export interface Statistics {
  parsed: number
  analyzed: number
  scriptsWritten: number
  inReview: number
}

// === INSTAGRAM ===

export interface InstagramProfile {
  id: string
  username: string
  profilePicUrl?: string
  reelsCount?: number
  lastSynced?: string
  isFavorite?: boolean
  createdAt: string
}

export interface Reel {
  id: string
  profileId: string
  shortCode: string
  caption?: string
  thumbnailUrl?: string
  instagramUrl?: string
  views?: number
  likes?: number
  comments?: number
  publishedDate?: string
  status?: 'new' | 'ready' | 'transcribed' | 'analyzed'
  transcript?: string
}

// === AI SCRIPT GENERATION ===

export type LLMProvider = 'anthropic' | 'deepseek'

export interface AISettings {
  provider: LLMProvider
  // API Keys info (only last4, not full keys)
  anthropicApiKeyLast4?: string | null
  deepseekApiKeyLast4?: string | null
  hasAnthropicKey?: boolean
  hasDeepseekKey?: boolean
  // Prompts
  scriptwriterPrompt: string
  editorPrompt: string
  maxIterations: number
  autoSendToHumanReview: boolean
  examples: UploadedExample[]
}

export interface UploadedExample {
  id: string
  filename: string
  content: string
  scenes?: string[] // разбитые на сцены
  uploadedAt: Date
}

export interface NewsScript {
  id: string
  newsTitle: string
  newsSource: string
  status: 'pending' | 'in_progress' | 'completed' | 'human_review'
  currentIteration: number
  maxIterations: number
  iterations: Iteration[]
  createdAt: Date
}

export interface Iteration {
  id: string
  version: number
  script: ScriptVersion
  review: Review | null
  createdAt: Date
}

export interface ScriptVersion {
  id: string
  version: number
  scenes: ScriptScene[]
  generatedAt: Date
  status: 'draft' | 'sent_for_review'
}

export interface ScriptScene {
  id: string
  number: number
  text: string
  visual: string
  duration: number // seconds
  changes?: SceneChanges // diff from previous version
}

export interface SceneChanges {
  added: string[]
  removed: string[]
  modified: boolean
}

export interface Review {
  id: string
  overallScore: number // 1-10
  overallComment: string
  sceneComments: SceneComment[]
  createdAt: Date
}

export interface SceneComment {
  sceneId: string
  sceneNumber: number
  comments: ReviewComment[]
}

export interface ReviewComment {
  id: string
  type: 'positive' | 'negative' | 'suggestion' | 'info'
  text: string
}

// === EXTENDED TYPES FOR LISTS ===

/**
 * Расширенный тип NewsScript для списков (с дополнительными вычисляемыми полями)
 */
export interface NewsScriptListItem extends NewsScript {
  iterationsCount: number
  lastScore: number | null
}
