import { useState, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"
import { type Project } from "@shared/schema"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScoreBadge } from "@/components/score-badge"
import { Sparkles, FileText, Edit2, Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

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

  // Get content from step data (step 2 saves as "text" for custom or "content" for news)
  const content = stepData?.content || stepData?.text || ""

  const analyzeMutation = useMutation({
    mutationFn: async (format: string) => {
      const res = await apiRequest("POST", "/api/ai/analyze-script", { format, content })
      return await res.json()
    },
    onSuccess: (data) => {
      setAnalysis(data)
      setSelectedFormat(data.format)
    },
  })

  // Auto-analyze on mount if content exists and no analysis yet
  useEffect(() => {
    if (content && !analysis && !analyzeMutation.isPending) {
      analyzeMutation.mutate(selectedFormat)
    }
  }, [content])

  const handleAnalyze = () => {
    analyzeMutation.mutate(selectedFormat)
  }

  const handleProceed = () => {
    // In real implementation, save analysis and proceed to stage 4
    console.log("Proceeding with", { selectedFormat, selectedVariants, editedScenes, analysis })
  }

  const getSceneText = (scene: AIAnalysis['scenes'][0]) => {
    if (editedScenes[scene.id]) return editedScenes[scene.id]
    if (selectedVariants[scene.id] !== undefined) {
      return scene.variants[selectedVariants[scene.id]]
    }
    return scene.text
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
            <div className="mt-6 flex justify-center">
              <Button
                size="lg"
                onClick={handleAnalyze}
                disabled={analyzeMutation.isPending || !content}
                data-testid="button-analyze"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {analysis ? "Re-analyze with Selected Format" : "Analyze Content"}
                  </>
                )}
              </Button>
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
                        <ScoreBadge score={scene.score} size="sm" data-testid={`score-scene-${scene.id}`} />
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
                        onValueChange={(value) => {
                          if (value === "original") {
                            const newVariants = { ...selectedVariants }
                            delete newVariants[scene.id]
                            setSelectedVariants(newVariants)
                          } else {
                            setSelectedVariants({ ...selectedVariants, [scene.id]: parseInt(value) })
                          }
                        }}
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
              <Button size="lg" onClick={handleProceed} data-testid="button-proceed-stage4">
                Continue to Voice Generation
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
    </div>
  )
}
