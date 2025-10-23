import { useState, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { type Project } from "@shared/schema"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScoreBadge } from "@/components/score-badge"
import { Sparkles, FileText, Edit2, Loader2, AlertCircle, DollarSign } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Stage3Props {
  project: Project
  stepData: any
}

// Format templates (15 total)
const FORMAT_TEMPLATES = [
  { id: "hook", name: "Hook & Story", description: "Attention-grabbing opening with narrative arc" },
  { id: "explainer", name: "Explainer", description: "Educational breakdown of complex topics" },
  { id: "news", name: "News Update", description: "Professional news report format" },
  { id: "tutorial", name: "Tutorial", description: "Step-by-step instructional guide" },
  { id: "listicle", name: "Top 5 List", description: "Numbered countdown format" },
  { id: "comparison", name: "Before/After", description: "Contrast and comparison structure" },
  { id: "controversy", name: "Hot Take", description: "Provocative opinion piece" },
  { id: "question", name: "Q&A Format", description: "Question-driven narrative" },
  { id: "story", name: "Story Time", description: "Personal narrative storytelling" },
  { id: "reaction", name: "Reaction Video", description: "Commentary on current events" },
  { id: "challenge", name: "Challenge", description: "Call to action format" },
  { id: "trends", name: "Trend Analysis", description: "Exploring what's viral now" },
  { id: "myth", name: "Myth Buster", description: "Debunking false beliefs" },
  { id: "prediction", name: "Future Forecast", description: "Predictions and implications" },
  { id: "case", name: "Case Study", description: "Deep dive into specific example" },
]

interface AIAnalysis {
  format: string
  overallScore: number
  overallComment: string
  scenes: Array<{
    id: number
    text: string
    score: number
    variants: string[]
  }>
}

export function Stage3AIAnalysis({ project, stepData }: Stage3Props) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<string>("news")
  const [selectedVariants, setSelectedVariants] = useState<Record<number, number>>({})
  const [editedScenes, setEditedScenes] = useState<Record<number, string>>({})
  const [isEditing, setIsEditing] = useState<number | null>(null)
  const [reanalyzeDialogOpen, setReanalyzeDialogOpen] = useState(false)
  const [variantScores, setVariantScores] = useState<Record<string, number>>({}) // sceneId-variantIdx -> score
  const [scoringVariant, setScoringVariant] = useState<string | null>(null) // "sceneId-variantIdx" during scoring
  const { toast } = useToast()

  // Get content from step data
  // - Custom scripts: stepData.text
  // - News: stepData.content
  // - Instagram: stepData.transcription (Phase 7)
  const content = stepData?.content || stepData?.text || stepData?.transcription || ""

  const analyzeMutation = useMutation({
    mutationFn: async (format: string) => {
      const res = await apiRequest("POST", "/api/ai/analyze-script", { format, content })
      return await res.json()
    },
    onSuccess: (data) => {
      setAnalysis(data)
      setSelectedFormat(data.format)
      
      // Save to cache immediately with fresh data (don't rely on state!)
      apiRequest("POST", `/api/projects/${project.id}/steps`, {
        stepNumber: 3,
        data: {
          selectedFormat: data.format,
          selectedVariants: {},
          editedScenes: {},
          overallScore: data.overallScore,
          overallComment: data.overallComment,
          scenes: data.scenes
        }
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "steps"] })
      }).catch(err => {
        console.error("Failed to cache analysis:", err)
      })
    },
  })

  // Score variant mutation
  const scoreVariantMutation = useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      const res = await apiRequest("POST", "/api/ai/score-text", { text })
      return await res.json()
    },
  })

  // Load cached analysis from stepData on mount
  useEffect(() => {
    // CHECK CACHE FIRST! Don't call AI if we have cached data
    if (stepData?.scenes && stepData?.overallScore !== undefined) {
      // Load from cache
      setAnalysis({
        format: stepData.selectedFormat || 'news',
        overallScore: stepData.overallScore,
        overallComment: stepData.overallComment || '',
        scenes: stepData.scenes
      })
      setSelectedFormat(stepData.selectedFormat || 'news')
      setSelectedVariants(stepData.selectedVariants || {})
      setEditedScenes(stepData.editedScenes || {})
      setVariantScores(stepData.variantScores || {}) // Restore variant scores!
    } else if (content && !analysis && !analyzeMutation.isPending) {
      // Only call AI if NO cache exists
      analyzeMutation.mutate(selectedFormat)
    }
  }, [content])

  const handleAnalyze = () => {
    // If analysis already exists (from cache), show cost warning
    if (analysis) {
      setReanalyzeDialogOpen(true)
    } else {
      analyzeMutation.mutate(selectedFormat)
    }
  }

  const confirmReanalyze = () => {
    setReanalyzeDialogOpen(false)
    analyzeMutation.mutate(selectedFormat)
  }

  // Save step data mutation
  const saveStepMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/projects/${project.id}/steps`, {
        stepNumber: 3,
        data: {
          selectedFormat,
          selectedVariants,
          editedScenes,
          variantScores, // Save variant scores!
          overallScore: analysis?.overallScore,
          overallComment: analysis?.overallComment,
          scenes: analysis?.scenes
        }
      })
    }
  })

  // Update project stage mutation
  const updateProjectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", `/api/projects/${project.id}`, {
        currentStage: 4
      })
    },
    onSuccess: async () => {
      // Invalidate and wait for refetch to ensure UI updates
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id] })
      await queryClient.refetchQueries({ queryKey: ["/api/projects", project.id] })
      await queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "steps"] })
      
      toast({
        title: "Analysis Saved",
        description: "Moving to Voice Generation...",
      })
    }
  })

  const handleProceed = async () => {
    if (!selectedFormat || !analysis) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please complete the analysis first",
      })
      return
    }

    try {
      // Save step data first
      await saveStepMutation.mutateAsync()
      // Then update project stage (which will trigger navigation via refetch)
      await updateProjectMutation.mutateAsync()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save and proceed",
      })
    }
  }

  const getSceneText = (scene: AIAnalysis['scenes'][0]) => {
    if (editedScenes[scene.id]) return editedScenes[scene.id]
    if (selectedVariants[scene.id] !== undefined) {
      return scene.variants[selectedVariants[scene.id]]
    }
    return scene.text
  }

  const getSceneScore = (scene: AIAnalysis['scenes'][0]) => {
    // If scene is edited, can't show accurate score
    if (editedScenes[scene.id]) return scene.score
    
    // If variant is selected, use variant score
    if (selectedVariants[scene.id] !== undefined) {
      const scoreKey = `${scene.id}-${selectedVariants[scene.id]}`
      return variantScores[scoreKey] ?? scene.score // fallback to original if not scored yet
    }
    
    // Original text, use original score
    return scene.score
  }

  const handleVariantChange = async (sceneId: number, variantValue: string, scene: AIAnalysis['scenes'][0]) => {
    if (variantValue === "original") {
      // Switch to original - remove from selectedVariants
      const newVariants = { ...selectedVariants }
      delete newVariants[sceneId]
      setSelectedVariants(newVariants)
      
      // Auto-save with updated variants
      await autoSaveCache(newVariants, variantScores)
    } else {
      const variantIdx = parseInt(variantValue)
      const newVariants = { ...selectedVariants, [sceneId]: variantIdx }
      setSelectedVariants(newVariants)
      
      // Check if we already have score for this variant
      const scoreKey = `${sceneId}-${variantIdx}`
      if (variantScores[scoreKey] === undefined) {
        // Need to score this variant
        const variantText = scene.variants[variantIdx]
        setScoringVariant(scoreKey)
        
        try {
          const result = await scoreVariantMutation.mutateAsync({ text: variantText })
          const newScores = { ...variantScores, [scoreKey]: result.score }
          setVariantScores(newScores)
          
          // Auto-save with updated variants AND scores
          await autoSaveCache(newVariants, newScores)
        } catch (error) {
          console.error('Failed to score variant:', error)
          toast({
            variant: "destructive",
            title: "Scoring Failed",
            description: "Could not calculate score for this variant",
          })
        } finally {
          setScoringVariant(null)
        }
      } else {
        // Variant already scored, just auto-save selection
        await autoSaveCache(newVariants, variantScores)
      }
    }
  }

  // Auto-save cache helper - accepts fresh values to avoid stale state
  const autoSaveCache = async (
    freshVariants: Record<number, number>,
    freshScores: Record<string, number>
  ) => {
    if (!analysis) return
    
    try {
      await apiRequest("POST", `/api/projects/${project.id}/steps`, {
        stepNumber: 3,
        data: {
          selectedFormat,
          selectedVariants: freshVariants,
          editedScenes,
          variantScores: freshScores,
          overallScore: analysis.overallScore,
          overallComment: analysis.overallComment,
          scenes: analysis.scenes
        }
      })
      console.log("✅ Auto-saved:", { variants: freshVariants, scores: freshScores })
    } catch (error) {
      console.error("Failed to auto-save:", error)
    }
  }

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
                disabled={analyzeMutation.isPending || !content}
                data-testid="button-analyze"
                variant={analysis ? "outline" : "default"}
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : analysis ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Re-analyze with Selected Format
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze Content
                  </>
                )}
              </Button>
              {analysis && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Re-analyzing will use AI credits (~$0.05)
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {analyzeMutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription data-testid="error-analysis">
              {(analyzeMutation.error as any)?.message || "Failed to analyze content. Please check your Anthropic API key in Settings."}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {analyzeMutation.isPending && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium">AI is analyzing your content...</p>
                <p className="text-sm text-muted-foreground">This may take 10-30 seconds</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analysis Results */}
        {analysis && !analyzeMutation.isPending && (
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
                    <p className="text-sm text-muted-foreground italic border-l-4 border-primary pl-4" data-testid="text-overall-comment">
                      {analysis.overallComment}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scene Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Scene-by-Scene Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {analysis.scenes.map(scene => (
                  <div key={scene.id} className="space-y-3" data-testid={`scene-${scene.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">Scene {scene.id}</Badge>
                        {scoringVariant === `${scene.id}-${selectedVariants[scene.id]}` ? (
                          <div className="flex items-center gap-2 px-3 py-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="text-xs text-muted-foreground">Scoring...</span>
                          </div>
                        ) : (
                          <ScoreBadge score={getSceneScore(scene)} size="sm" data-testid={`score-scene-${scene.id}`} />
                        )}
                      </div>
                      {isEditing === scene.id ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsEditing(null)}
                          data-testid={`button-done-edit-${scene.id}`}
                        >
                          Done
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-2"
                          onClick={() => setIsEditing(scene.id)}
                          data-testid={`button-edit-${scene.id}`}
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit
                        </Button>
                      )}
                    </div>

                    {isEditing === scene.id ? (
                      <Textarea
                        value={editedScenes[scene.id] || getSceneText(scene)}
                        onChange={(e) => setEditedScenes({ ...editedScenes, [scene.id]: e.target.value })}
                        rows={3}
                        data-testid={`textarea-scene-${scene.id}`}
                      />
                    ) : (
                      <Tabs
                        value={selectedVariants[scene.id]?.toString() || "original"}
                        onValueChange={(value) => handleVariantChange(scene.id, value, scene)}
                      >
                        <TabsList className="mb-3">
                          <TabsTrigger value="original" data-testid={`tab-original-${scene.id}`}>
                            Original
                          </TabsTrigger>
                          {scene.variants.map((_, idx) => (
                            <TabsTrigger key={idx} value={idx.toString()} data-testid={`tab-variant-${scene.id}-${idx}`}>
                              Variant {idx + 1}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        <TabsContent value="original">
                          <p className="text-sm p-4 bg-muted rounded-lg" data-testid={`text-scene-${scene.id}-original`}>{scene.text}</p>
                        </TabsContent>
                        {scene.variants.map((variant, idx) => (
                          <TabsContent key={idx} value={idx.toString()}>
                            <p className="text-sm p-4 bg-muted rounded-lg" data-testid={`text-scene-${scene.id}-variant-${idx}`}>{variant}</p>
                          </TabsContent>
                        ))}
                      </Tabs>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="lg" data-testid="button-export-script">
                <FileText className="h-4 w-4 mr-2" />
                Export Script
              </Button>
              <Button 
                size="lg" 
                onClick={handleProceed} 
                disabled={saveStepMutation.isPending || updateProjectMutation.isPending}
                data-testid="button-proceed-stage4"
              >
                {(saveStepMutation.isPending || updateProjectMutation.isPending) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Continue to Voice Generation"
                )}
              </Button>
            </div>
          </>
        )}

        {/* Empty State */}
        {!analysis && !analyzeMutation.isPending && !analyzeMutation.isError && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4 text-center">
                <Sparkles className="h-16 w-16 text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Ready to Analyze</h3>
                  <p className="text-sm text-muted-foreground">
                    Select a format template above and click "Analyze Content" to begin
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Re-analyze Confirmation Dialog */}
      <AlertDialog open={reanalyzeDialogOpen} onOpenChange={setReanalyzeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-amber-500" />
              Re-analyze Content?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will call the AI API again and use credits (~$0.05 per analysis).
              </p>
              <p className="text-sm">
                Your current analysis is already saved. Only re-analyze if:
              </p>
              <ul className="text-sm list-disc list-inside space-y-1 ml-2">
                <li>You changed the format template</li>
                <li>You want different AI-generated variants</li>
                <li>The current analysis has issues</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-reanalyze">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReanalyze}
              className="bg-amber-600 hover:bg-amber-700"
              data-testid="button-confirm-reanalyze"
            >
              Re-analyze (~$0.05)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
