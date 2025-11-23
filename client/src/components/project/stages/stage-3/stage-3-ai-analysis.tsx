import { useState } from "react"
import { type AdvancedScoreResult } from "@shared/advanced-analysis-types"
import { useToast } from "@/hooks/use-toast"

// Import all hooks
import { type Stage3Props, type AIAnalysis } from "./types/analysis-types"
import { useScriptVersions } from "./hooks/use-script-versions"
import { useVersionMutations } from "./hooks/use-version-mutations"
import { useReanalysisMutation } from "./hooks/use-reanalysis-mutation"
import { useReanalysisPolling } from "./hooks/use-reanalysis-polling"
import { useSourceAnalysis } from "./hooks/use-source-analysis"
import { useGenerateScript } from "./hooks/use-generate-script"
import { useAdvancedAnalysis } from "./hooks/use-advanced-analysis"
import { useLegacyAnalysis } from "./hooks/use-legacy-analysis"
import { useCachedAnalysis } from "./hooks/use-cached-analysis"
import { useSaveMutations } from "./hooks/use-save-mutations"

// Import components
import { SourceReviewMode } from "./components/SourceReviewMode"
import { SceneEditorMode } from "./components/SceneEditorMode"
import { LegacyAnalysisMode } from "./components/LegacyAnalysisMode"

export function Stage3AIAnalysis({ project, stepData, step3Data }: Stage3Props) {
  const { toast } = useToast()

  // State management
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [compareOpen, setCompareOpen] = useState(false)
  const [reanalyzeJobId, setReanalyzeJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<any>(null)
  const [advancedAnalysis, setAdvancedAnalysis] = useState<AdvancedScoreResult | null>(null)
  const [analysisMode, setAnalysisMode] = useState<'simple' | 'advanced'>('advanced')
  const [selectedFormat, setSelectedFormat] = useState<string>("news")
  const [selectedVariants, setSelectedVariants] = useState<Record<number, number>>({})
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false)
  const [recoveryError, setRecoveryError] = useState<any>(null)
  const [failedFormatId, setFailedFormatId] = useState<string | null>(null)
  const [editedScenes, setEditedScenes] = useState<Record<number, string>>({})
  const [isEditing, setIsEditing] = useState<number | null>(null)
  const [reanalyzeDialogOpen, setReanalyzeDialogOpen] = useState(false)
  const [variantScores, setVariantScores] = useState<Record<string, number>>({})
  const [scoringVariant, setScoringVariant] = useState<string | null>(null)
  const [analysisTime, setAnalysisTime] = useState<number | undefined>(undefined)
  const [showFormatModal, setShowFormatModal] = useState(false)
  const [targetLanguage, setTargetLanguage] = useState<'ru' | 'en'>('ru')

  // Feature flag check
  const STAGE3_MAGIC_UI = import.meta.env.VITE_STAGE3_MAGIC_UI === 'true'

  // Get content from step data
  const content = stepData?.content || stepData?.text || stepData?.transcription || ""

  // Use all hooks
  const { scriptVersionsQuery, hasScript, hasCandidate, currentVersion, candidateVersion } = useScriptVersions(project)
  const { acceptMutation, rejectMutation } = useVersionMutations(project.id)
  const { reanalyzeMutation, lastSubmittedPayload } = useReanalysisMutation(project.id, setReanalyzeJobId, setJobStatus, setCompareOpen)

  useReanalysisPolling(project.id, reanalyzeJobId, setReanalyzeJobId, setJobStatus, setCompareOpen, lastSubmittedPayload)

  const { shouldAnalyze, setShouldAnalyze, sourceAnalysisQuery, handleStartAnalysis, sourceData } = useSourceAnalysis(project, hasScript, content, stepData)

  const { generateMutation, handleGenerateScript } = useGenerateScript(
    project.id,
    targetLanguage,
    scriptVersionsQuery,
    setRecoveryError,
    setFailedFormatId,
    setRecoveryModalOpen
  )

  const { advancedAnalyzeMutation } = useAdvancedAnalysis(
    project,
    stepData,
    content,
    selectedFormat,
    setAdvancedAnalysis,
    setAnalysisTime
  )

  const { analyzeMutation, scoreVariantMutation } = useLegacyAnalysis(
    project.id,
    content,
    setAnalysis,
    setSelectedFormat,
    setVariantScores,
    setScoringVariant
  )

  useCachedAnalysis(
    project.id,
    step3Data,
    setShouldAnalyze,
    setAdvancedAnalysis,
    setAnalysisMode,
    setAnalysisTime,
    setSelectedFormat,
    setAnalysis,
    setSelectedVariants,
    setEditedScenes,
    setVariantScores
  )

  const { saveStepMutation, updateProjectMutation, handleProceed } = useSaveMutations(
    project.id,
    analysisMode,
    advancedAnalysis,
    analysisTime,
    selectedFormat,
    analysis,
    selectedVariants,
    editedScenes,
    variantScores,
    STAGE3_MAGIC_UI,
    hasScript,
    scriptVersionsQuery,
    candidateVersion,
    reanalyzeJobId
  )

  // Helper functions
  const handleAnalyze = () => {
    if (advancedAnalysis || analysis) {
      setReanalyzeDialogOpen(true)
    } else {
      if (analysisMode === 'advanced') {
        advancedAnalyzeMutation.mutate()
      } else {
        analyzeMutation.mutate(selectedFormat)
      }
    }
  }

  const confirmReanalyze = () => {
    setReanalyzeDialogOpen(false)
    if (analysisMode === 'advanced') {
      advancedAnalyzeMutation.mutate()
    } else {
      analyzeMutation.mutate(selectedFormat)
    }
  }

  const handleOpenCompare = () => {
    console.log('[Compare] Click - hasCandidate:', hasCandidate, 'jobRunning:', !!reanalyzeJobId)
    setCompareOpen(true)
  }

  // MODE 1: Source review mode (STAGE3_MAGIC_UI enabled, no script yet)
  if (STAGE3_MAGIC_UI && !hasScript) {
    return (
      <SourceReviewMode
        project={project}
        stepData={stepData}
        sourceData={sourceData}
        hasScript={hasScript}
        shouldAnalyze={shouldAnalyze}
        handleStartAnalysis={handleStartAnalysis}
        sourceAnalysisQuery={sourceAnalysisQuery}
        handleGenerateScript={handleGenerateScript}
        generateMutation={generateMutation}
        targetLanguage={targetLanguage}
        setTargetLanguage={setTargetLanguage}
        showFormatModal={showFormatModal}
        setShowFormatModal={setShowFormatModal}
        compareOpen={compareOpen}
        setCompareOpen={setCompareOpen}
        currentVersion={currentVersion}
        candidateVersion={candidateVersion}
        reanalyzeJobId={reanalyzeJobId}
        jobStatus={jobStatus}
        handleProceed={handleProceed}
      />
    )
  }

  // MODE 2: Scene editor mode (STAGE3_MAGIC_UI enabled, script exists)
  if (STAGE3_MAGIC_UI && hasScript) {
    return (
      <SceneEditorMode
        project={project}
        sourceData={sourceData}
        scriptVersionsQuery={scriptVersionsQuery}
        candidateVersion={candidateVersion}
        reanalyzeJobId={reanalyzeJobId}
        jobStatus={jobStatus}
        lastSubmittedPayload={lastSubmittedPayload}
        hasCandidate={hasCandidate}
        compareOpen={compareOpen}
        targetLanguage={targetLanguage}
        reanalyzeMutation={reanalyzeMutation}
        acceptMutation={acceptMutation}
        rejectMutation={rejectMutation}
        updateProjectMutation={updateProjectMutation}
        setCompareOpen={setCompareOpen}
        handleOpenCompare={handleOpenCompare}
        handleProceed={handleProceed}
      />
    )
  }

  // MODE 3: Legacy Analysis Mode (when feature flag is off OR script exists)
  return (
    <LegacyAnalysisMode
      project={project}
      stepData={stepData}
      content={content}
      selectedFormat={selectedFormat}
      setSelectedFormat={setSelectedFormat}
      analysis={analysis}
      advancedAnalysis={advancedAnalysis}
      analysisTime={analysisTime}
      analyzeMutation={analyzeMutation}
      advancedAnalyzeMutation={advancedAnalyzeMutation}
      scoreVariantMutation={scoreVariantMutation}
      handleAnalyze={handleAnalyze}
      confirmReanalyze={confirmReanalyze}
      reanalyzeDialogOpen={reanalyzeDialogOpen}
      setReanalyzeDialogOpen={setReanalyzeDialogOpen}
      editedScenes={editedScenes}
      setEditedScenes={setEditedScenes}
      isEditing={isEditing}
      setIsEditing={setIsEditing}
      selectedVariants={selectedVariants}
      setSelectedVariants={setSelectedVariants}
      variantScores={variantScores}
      setVariantScores={setVariantScores}
      scoringVariant={scoringVariant}
      setScoringVariant={setScoringVariant}
      updateProjectMutation={updateProjectMutation}
      handleProceed={handleProceed}
      hasCandidate={hasCandidate}
      currentVersion={currentVersion}
      candidateVersion={candidateVersion}
      compareOpen={compareOpen}
      setCompareOpen={setCompareOpen}
      handleOpenCompare={handleOpenCompare}
      reanalyzeJobId={reanalyzeJobId}
      jobStatus={jobStatus}
      recoveryModalOpen={recoveryModalOpen}
      setRecoveryModalOpen={setRecoveryModalOpen}
      recoveryError={recoveryError}
      failedFormatId={failedFormatId}
      generateMutation={generateMutation}
      toast={toast}
    />
  )
}
