/**
 * Conveyor Types
 * Core type definitions for the Content Factory pipeline
 */

// ============================================================================
// SOURCE DATA
// ============================================================================

export interface SourceData {
  type: 'news' | 'instagram'
  itemId: string
  title: string
  content: string
  url: string
  publishedAt: Date
  imageUrl?: string
}

// ============================================================================
// SCORING DATA (Agent #2)
// ============================================================================

export interface ScoringBreakdown {
  factScore: number      // 0-35: concrete facts/numbers
  relevanceScore: number // 0-25: trending/relevance
  audienceScore: number  // 0-20: audience breadth
  interestScore: number  // 0-20: topic interest
}

export interface ScoringData {
  score: number           // 0-100 total
  verdict: 'viral' | 'strong' | 'moderate' | 'weak'
  breakdown: ScoringBreakdown
  reasoning: string
}

// ============================================================================
// ANALYSIS DATA (Agent #3)
// ============================================================================

export interface AnalysisData {
  mainTopic: string
  subTopics: string[]
  targetAudience: string[]
  emotionalAngles: string[]
  keyFacts: string[]
  controversyLevel: number // 1-10
  uniqueAngle: string
}

// ============================================================================
// ARCHITECTURE DATA (Agent #4)
// ============================================================================

export interface StructureTemplate {
  hook: { duration: number; purpose: string }
  context: { duration: number; purpose: string }
  main: { duration: number; purpose: string }
  twist: { duration: number; purpose: string }
  cta: { duration: number; purpose: string }
}

export interface ArchitectureData {
  formatId: string
  formatName: string
  reasoning: string
  suggestedHooks: string[]
  structureTemplate: StructureTemplate
  totalDuration: number
}

// ============================================================================
// SCRIPT DATA (Agent #5)
// ============================================================================

export interface ScriptScene {
  id: number
  label: 'hook' | 'context' | 'main' | 'twist' | 'cta'
  text: string
  start: number
  end: number
  visualNotes?: string
}

export interface ScriptData {
  scenes: ScriptScene[]
  fullScript: string
  estimatedDuration: number
}

// ============================================================================
// QC DATA (Agent #6)
// ============================================================================

export interface WeakSpot {
  sceneId: number
  area: 'hook' | 'structure' | 'emotional' | 'cta'
  issue: string
  severity: 'critical' | 'major' | 'minor'
  suggestion: string
}

export interface QCData {
  overallScore: number
  hookScore: number
  structureScore: number
  emotionalScore: number
  ctaScore: number
  weakSpots: WeakSpot[]
  passedQC: boolean
}

// ============================================================================
// OPTIMIZATION DATA (Agent #7)
// ============================================================================

export interface OptimizationChange {
  sceneId: number
  original: string
  improved: string
  reason: string
}

export interface OptimizationData {
  improvedScenes: ScriptScene[]
  changesApplied: OptimizationChange[]
  fullScript: string
  iterationNumber: number
}

// ============================================================================
// GATE DATA (Agent #8)
// ============================================================================

export interface GateData {
  decision: 'PASS' | 'FAIL' | 'NEEDS_REVIEW'
  reason: string
  confidence: number
  finalScore: number
  passedAfterIterations: number
}

// ============================================================================
// STAGE HISTORY
// ============================================================================

export interface StageHistoryEntry {
  stage: number
  agentName: string
  startedAt: Date
  completedAt: Date
  success: boolean
  error?: string
  cost?: number
}

// ============================================================================
// REVISION CONTEXT
// ============================================================================

export interface RevisionContext {
  notes: string
  previousScriptId: string
  attempt: number
}

// ============================================================================
// CONVEYOR ITEM (Full pipeline state)
// ============================================================================

export interface ConveyorItemData {
  id: string
  userId: string
  sourceType: 'news' | 'instagram'
  sourceItemId: string
  status: 'processing' | 'completed' | 'failed'
  currentStage: number

  // Data from each agent
  sourceData?: SourceData
  scoringData?: ScoringData
  analysisData?: AnalysisData
  architectureData?: ArchitectureData
  scriptData?: ScriptData
  qcData?: QCData
  optimizationData?: OptimizationData
  gateData?: GateData

  // History and context
  stageHistory: StageHistoryEntry[]
  revisionContext?: RevisionContext
  parentItemId?: string

  // Metrics
  startedAt: Date
  completedAt?: Date
  totalProcessingMs?: number
  totalCost: number

  // Error tracking
  errorStage?: number
  errorMessage?: string
  retryCount: number
}

// ============================================================================
// AGENT RESULT
// ============================================================================

export interface AgentResult<T> {
  success: boolean
  data?: T
  error?: string
  cost: number
  durationMs: number
}

// ============================================================================
// REJECTION PATTERN (Learning System)
// ============================================================================

export interface RejectionPattern {
  count: number
  instruction: string
  lastReason?: string
  examples?: string[]
}

export type RejectionPatterns = Record<string, RejectionPattern>

// ============================================================================
// USER CUSTOMIZATION SETTINGS (Phase 1 & 2)
// ============================================================================

export interface StylePreferences {
  formality: 'formal' | 'conversational' | 'casual'
  tone: 'serious' | 'engaging' | 'funny' | 'motivational'
  language: 'ru' | 'en'
}

export interface DurationRange {
  min: number // seconds
  max: number // seconds
}

export interface CustomPrompts {
  writerPrompt?: string
  architectPrompt?: string
  analystPrompt?: string
  scorerPrompt?: string
}

export interface UserCustomization {
  stylePreferences: StylePreferences
  customGuidelines: string[]
  durationRange: DurationRange
  customPrompts?: CustomPrompts
}

// ============================================================================
// USER WRITING CONTEXT (from feedback learning)
// ============================================================================

export interface UserWritingContext {
  instructions: string[]     // Converted from writingRules (e.g., "НИКОГДА НЕ: использовать клише")
  avoidPatterns: string[]    // Things to avoid (e.g., "фраза 'СТОП!'")
  preferPatterns: string[]   // Things to prefer (e.g., "провокационное начало")
  aiSummary: string | null   // AI-generated summary of user's writing style
}

// ============================================================================
// ENHANCED REVISION CONTEXT (with previous versions)
// ============================================================================

export interface PreviousVersionData {
  versionNumber: number
  fullScript: string
  scenes?: ScriptScene[]
  feedbackText: string
}

export interface EnhancedRevisionContext extends RevisionContext {
  previousVersions?: PreviousVersionData[]
  selectedSceneIds?: number[]
}
