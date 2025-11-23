import { useState } from "react"
import { type AdvancedScoreResult } from "@shared/advanced-analysis-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScoreBadge } from "@/components/score-badge"
import { AdvancedAnalysisDisplay } from "@/components/project/advanced-analysis-display"
import { SceneEditor } from "@/components/project/scene-editor"
import { SourceSummaryBar } from "../../source-summary-bar"
import { ReanalysisProgressCard } from "../../reanalysis-progress-card"
import { CompareModal } from "../../compare-modal"
import { Sparkles, FileText, Edit2, Loader2, AlertCircle, DollarSign, Zap, GitCompareArrows, CheckCircle, X, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"

// Import all hooks
import { type Stage3Props, type AIAnalysis } from "./types/analysis-types"
import { FORMAT_TEMPLATES } from "./constants/format-templates"
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
import { getSceneText, getSceneScore, handleVariantChange as handleVariantChangeHelper, autoSaveCache as autoSaveCacheHelper } from "./utils/scene-helpers"
import { SourceReviewMode } from "./components/SourceReviewMode"

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
  const autoSaveCache = async (freshVariants: Record<number, number>, freshScores: Record<string, number>) => {
    return autoSaveCacheHelper(project.id, selectedFormat, freshVariants, editedScenes, freshScores, analysis)
  }

  const handleVariantChange = async (sceneId: number, variantValue: string, scene: AIAnalysis['scenes'][0]) => {
    return handleVariantChangeHelper(
      sceneId,
      variantValue,
      scene,
      selectedVariants,
      variantScores,
      setSelectedVariants,
      setVariantScores,
      setScoringVariant,
      scoreVariantMutation,
      autoSaveCache,
      toast
    )
  }

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
    const current = scriptVersionsQuery.data?.currentVersion
    const candidate = candidateVersion

    // Show candidate if it exists (user just saved it), otherwise show current
    const versionToRender = candidate ?? current

    // Extend sourceData with script language for Scene Editor mode
    const editorSourceData = {
      ...sourceData,
      scriptLanguage: versionToRender?.scriptLanguage || targetLanguage || 'ru'
    }

    if (scriptVersionsQuery.isLoading) {
      return (
        <div className="p-8 max-w-6xl mx-auto">
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium">Загружаем сценарий...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    if (!versionToRender) {
      return (
        <div className="p-8 max-w-6xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Сценарий не найден. Пожалуйста, создайте новый сценарий.
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Edit2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Редактор сценария</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Просмотрите и отредактируйте сцены, примените рекомендации AI
          </p>
        </div>

        <div className="space-y-4">
          <SourceSummaryBar source={editorSourceData} projectId={project.id} />

          {/* Reanalysis Progress Card */}
          {jobStatus && (
            <ReanalysisProgressCard
              status={jobStatus.status}
              step={jobStatus.step}
              progress={jobStatus.progress}
              error={jobStatus.error}
              canRetry={jobStatus.canRetry}
              onRetry={() => {
                if (lastSubmittedPayload.current) {
                  reanalyzeMutation.mutate(lastSubmittedPayload.current)
                }
              }}
            />
          )}

          {/* Candidate Version Banner */}
          {hasCandidate && candidate && (
            <Card className="border-primary/50 bg-primary/5" data-testid="banner-candidate">
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <Info className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="font-medium">
                        Новая версия v{candidate.versionNumber} сохранена
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {reanalyzeJobId ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Анализ выполняется...
                          </span>
                        ) : (
                          candidate.metrics ? "Анализ завершён" : "Ожидание анализа"
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenCompare}
                      disabled={!candidate.metrics || reanalyzeJobId !== null}
                      data-testid="button-compare-banner"
                    >
                      <GitCompareArrows className="h-4 w-4 mr-2" />
                      Сравнить
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => acceptMutation.mutate(candidate.id)}
                      disabled={acceptMutation.isPending || !candidate.metrics || reanalyzeJobId !== null}
                      data-testid="button-accept-banner"
                    >
                      {acceptMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Принимаем...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Принять
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => rejectMutation.mutate(candidate.id)}
                      disabled={rejectMutation.isPending}
                      data-testid="button-reject-banner"
                    >
                      {rejectMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div data-testid="scene-editor">
            <SceneEditor
              projectId={project.id}
              scenes={versionToRender.scenes}
              activeVersionId={versionToRender.id}
              onReanalyze={(scenes, fullScript) => {
                if (reanalyzeMutation.isPending) return
                reanalyzeMutation.mutate({ scenes, fullScript })
              }}
              onOpenCompare={handleOpenCompare}
              hasCandidate={hasCandidate}
              reanalyzeJobId={reanalyzeJobId}
              jobStatus={jobStatus}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              size="lg"
              onClick={handleProceed}
              disabled={updateProjectMutation.isPending}
              data-testid="button-proceed"
            >
              {updateProjectMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Сохраняем...
                </>
              ) : (
                <>
                  Перейти к озвучке
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Compare Modal */}
        <CompareModal
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
          projectId={project.id}
          reanalyzeJobId={reanalyzeJobId}
          jobStatus={jobStatus}
          onNavigateToVoice={handleProceed}
        />
      </div>
    )
  }

  // MODE 3: Legacy Analysis Mode (when feature flag is off OR script exists)
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">AI Analysis & Formatting</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Review AI-generated scenes and choose your preferred format
        </p>
      </div>

      <div className="space-y-6">
        {/* Format Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Choose Format Template</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FORMAT_TEMPLATES.map(template => (
                <div
                  key={template.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover-elevate ${
                    selectedFormat === template.id
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                  onClick={() => setSelectedFormat(template.id)}
                  data-testid={`template-${template.id}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold">{template.name}</h3>
                    {selectedFormat === template.id && (
                      <Badge variant="default">Selected</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </div>
              ))}
            </div>

            {/* Analyze Button */}
            <div className="mt-6 flex flex-col items-center gap-2">
              <Button
                size="lg"
                onClick={handleAnalyze}
                disabled={advancedAnalyzeMutation.isPending || analyzeMutation.isPending || !content}
                data-testid="button-analyze"
                variant={(advancedAnalysis || analysis) ? "outline" : "default"}
              >
                {(advancedAnalyzeMutation.isPending || analyzeMutation.isPending) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (advancedAnalysis || analysis) ? (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Re-analyze with Selected Format
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Analyze Content (Advanced)
                  </>
                )}
              </Button>
              {(advancedAnalysis || analysis) && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Re-analyzing will use AI credits (~$0.08-0.12 for deep analysis)
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {(analyzeMutation.isError || advancedAnalyzeMutation.isError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription data-testid="error-analysis">
              {(advancedAnalyzeMutation.error as any)?.message ||
               (analyzeMutation.error as any)?.message ||
               "Failed to analyze content. Please check your Anthropic API key in Settings."}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {advancedAnalyzeMutation.isPending && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium">Multi-Agent AI Analysis in Progress...</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="h-4 w-4" />
                  <span>Hook → Structure → Emotional → CTA → Synthesis</span>
                </div>
                <p className="text-sm text-muted-foreground">This may take 8-15 seconds</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legacy Loading State */}
        {analyzeMutation.isPending && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium">AI is analyzing your content...</p>
                <p className="text-sm text-muted-foreground">This may take 5-10 seconds</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Advanced Analysis Results */}
        {advancedAnalysis && !advancedAnalyzeMutation.isPending && (
          <>
            <AdvancedAnalysisDisplay
              analysis={advancedAnalysis}
              analysisTime={analysisTime}
            />

            {/* Interactive Scene Editor with Recommendations */}
            {stepData?.scenes && stepData.scenes.length > 0 && (
              <SceneEditor
                projectId={project.id}
                scenes={stepData.scenes}
                onReanalyze={(scenes, fullScript) => setReanalyzeDialogOpen(true)}
                onOpenCompare={handleOpenCompare}
                hasCandidate={hasCandidate}
                reanalyzeJobId={reanalyzeJobId}
                jobStatus={jobStatus}
              />
            )}

            {/* Action Buttons for Advanced Analysis */}
            <div className="flex justify-end gap-3">
              <Button
                size="lg"
                onClick={handleProceed}
                disabled={updateProjectMutation.isPending}
                data-testid="button-proceed"
              >
                {updateProjectMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue to Voice Generation
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Legacy Simple Analysis Results */}
        {analysis && !analyzeMutation.isPending && !advancedAnalysis && (
          <>
            {/* Overall Score */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-6">
                  <div className="text-center">
                    <ScoreBadge score={analysis.overallScore} size="lg" className="mb-2" data-testid="score-overall" />
                    <p className="text-sm font-medium">Overall Score</p>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      AI Comment
                    </h3>
                    <p className="text-sm text-muted-foreground italic leading-relaxed" data-testid="text-overall-comment">
                      {analysis.overallComment}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scene Tabs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Script Scenes ({analysis.scenes.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="scene-0" className="w-full">
                  <TabsList className="w-full justify-start flex-wrap h-auto">
                    {analysis.scenes.map((scene, idx) => (
                      <TabsTrigger
                        key={scene.id}
                        value={`scene-${idx}`}
                        className="gap-2"
                        data-testid={`tab-scene-${idx}`}
                      >
                        Scene {idx + 1}
                        <ScoreBadge score={getSceneScore(scene, editedScenes, selectedVariants, variantScores)} size="sm" />
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {analysis.scenes.map((scene, idx) => (
                    <TabsContent key={scene.id} value={`scene-${idx}`} className="mt-4 space-y-4">
                      {/* Original/Edited Text */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium flex items-center gap-2">
                            Scene {idx + 1} Text
                            <ScoreBadge score={getSceneScore(scene, editedScenes, selectedVariants, variantScores)} size="sm" data-testid={`score-scene-${idx}`} />
                          </label>
                          {!editedScenes[scene.id] && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsEditing(scene.id)}
                              data-testid={`button-edit-scene-${idx}`}
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>

                        {isEditing === scene.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editedScenes[scene.id] || getSceneText(scene, editedScenes, selectedVariants)}
                              onChange={(e) => setEditedScenes({ ...editedScenes, [scene.id]: e.target.value })}
                              rows={4}
                              className="resize-none"
                              data-testid={`textarea-scene-${idx}`}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={async () => {
                                  setIsEditing(null)
                                  await autoSaveCache(selectedVariants, variantScores)
                                }}
                                data-testid={`button-save-scene-${idx}`}
                              >
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newEdited = { ...editedScenes }
                                  delete newEdited[scene.id]
                                  setEditedScenes(newEdited)
                                  setIsEditing(null)
                                }}
                                data-testid={`button-cancel-edit-scene-${idx}`}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid={`text-scene-${idx}`}>
                              {getSceneText(scene, editedScenes, selectedVariants)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Variant Selector */}
                      {scene.variants.length > 0 && !editedScenes[scene.id] && (
                        <div>
                          <label className="text-sm font-medium block mb-2">
                            Alternative Versions
                          </label>
                          <div className="space-y-2">
                            {/* Original */}
                            <div
                              className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover-elevate ${
                                selectedVariants[scene.id] === undefined
                                  ? "border-primary bg-primary/5"
                                  : "border-border"
                              }`}
                              onClick={() => handleVariantChange(scene.id, "original", scene)}
                              data-testid={`variant-original-scene-${idx}`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">Original</span>
                                <ScoreBadge score={scene.score} size="sm" />
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {scene.text}
                              </p>
                            </div>

                            {/* Variants */}
                            {scene.variants.map((variant, vIdx) => {
                              const scoreKey = `${scene.id}-${vIdx}`
                              const variantScore = variantScores[scoreKey]
                              const isScoring = scoringVariant === scoreKey

                              return (
                                <div
                                  key={vIdx}
                                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover-elevate ${
                                    selectedVariants[scene.id] === vIdx
                                      ? "border-primary bg-primary/5"
                                      : "border-border"
                                  }`}
                                  onClick={() => handleVariantChange(scene.id, vIdx.toString(), scene)}
                                  data-testid={`variant-${vIdx}-scene-${idx}`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium">Version {vIdx + 1}</span>
                                    {isScoring ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : variantScore !== undefined ? (
                                      <ScoreBadge score={variantScore} size="sm" />
                                    ) : (
                                      <span className="text-xs text-muted-foreground">Click to score</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {variant}
                                  </p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                size="lg"
                onClick={handleProceed}
                disabled={updateProjectMutation.isPending}
                data-testid="button-proceed"
              >
                {updateProjectMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue to Voice Generation
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Re-analyze Cost Warning Dialog */}
      <AlertDialog open={reanalyzeDialogOpen} onOpenChange={setReanalyzeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Re-analyze Content?</AlertDialogTitle>
            <AlertDialogDescription>
              Re-running the analysis will consume AI credits (~$0.08-0.12 for deep analysis with 5 agents).
              Your previous analysis results will be overwritten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-reanalyze">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReanalyze} data-testid="button-confirm-reanalyze">
              Proceed and Re-analyze
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Compare Modal */}
      <CompareModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        projectId={project.id}
        reanalyzeJobId={reanalyzeJobId}
        jobStatus={jobStatus}
        baseVersionId={hasCandidate ? currentVersion?.id : undefined}
        targetVersionId={hasCandidate ? candidateVersion?.id : undefined}
      />

      {/* Recovery Modal for NO_SCENES error */}
      <Dialog open={recoveryModalOpen} onOpenChange={setRecoveryModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Не удалось создать сценарий
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {recoveryError?.message || 'AI не смог создать сцены после нескольких попыток'}
            </p>

            {recoveryError?.suggestions && recoveryError.suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Попробуйте:</p>
                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                  {recoveryError.suggestions.map((suggestion: string, idx: number) => (
                    <li key={idx}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={() => {
                  setRecoveryModalOpen(false)
                  if (failedFormatId) {
                    generateMutation.mutate(failedFormatId)
                  }
                }}
                disabled={generateMutation.isPending}
                data-testid="button-retry-generation"
              >
                <Zap className="h-4 w-4 mr-2" />
                Повторить попытку
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setRecoveryModalOpen(false)
                  // Scroll to format selection
                  const formatSection = document.querySelector('[data-testid="format-selection"]')
                  if (formatSection) {
                    formatSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }
                }}
                data-testid="button-choose-different-format"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Выбрать другой формат
              </Button>

              <Button
                variant="secondary"
                onClick={() => {
                  setRecoveryModalOpen(false)
                  toast({
                    title: "Функция в разработке",
                    description: "Создание версии из статьи будет доступно в следующей версии",
                  })
                }}
                data-testid="button-create-draft"
              >
                <FileText className="h-4 w-4 mr-2" />
                Создать версию из статьи
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
