import { useState } from "react"
import { type Project } from "@shared/schema"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScoreBadge } from "@/components/score-badge"
import { Sparkles, FileText, Edit2 } from "lucide-react"

interface Stage3Props {
  project: Project
  stepData: any
}

// Mock format templates
const FORMAT_TEMPLATES = [
  { id: "hook", name: "Hook & Story", description: "Attention-grabbing opening" },
  { id: "explainer", name: "Explainer", description: "Educational breakdown" },
  { id: "news", name: "News Update", description: "Professional news format" },
  { id: "tutorial", name: "Tutorial", description: "Step-by-step guide" },
  { id: "listicle", name: "Top 5 List", description: "Numbered list format" },
]

// Mock AI analysis data
const MOCK_ANALYSIS = {
  suggestedFormat: "news",
  overallScore: 85,
  aiComment: "This content has strong viral potential due to its timely nature and clear narrative structure. The key elements are well-balanced.",
  scenes: [
    {
      id: 1,
      text: "Breaking: AI technology reaches new milestone in natural language processing.",
      score: 92,
      variants: [
        "Major breakthrough: AI achieves unprecedented language understanding capabilities.",
        "Revolutionary development in AI sparks industry-wide excitement.",
        "Game-changing AI advancement transforms natural language processing forever.",
      ]
    },
    {
      id: 2,
      text: "Researchers demonstrate advanced conversational abilities that surpass previous benchmarks.",
      score: 78,
      variants: [
        "Scientists reveal AI can now engage in complex, nuanced conversations.",
        "New AI model shows remarkable improvement in understanding context and intent.",
        "Breakthrough research proves AI can match human-level conversation skills.",
      ]
    },
    {
      id: 3,
      text: "Industry experts predict significant impacts across technology sectors within the next year.",
      score: 85,
      variants: [
        "Leading analysts forecast dramatic shifts in tech industry landscape.",
        "Top experts warn of massive disruption coming to multiple sectors.",
        "Technology leaders prepare for transformative changes ahead.",
      ]
    },
  ]
}

export function Stage3AIAnalysis({ project }: Stage3Props) {
  const [selectedFormat, setSelectedFormat] = useState(MOCK_ANALYSIS.suggestedFormat)
  const [selectedVariants, setSelectedVariants] = useState<Record<number, number>>({})
  const [editedScenes, setEditedScenes] = useState<Record<number, string>>({})
  const [isEditing, setIsEditing] = useState<number | null>(null)

  const handleProceed = () => {
    // In real implementation, this would save and proceed to stage 4
    console.log("Proceeding with", { selectedFormat, selectedVariants, editedScenes })
  }

  const getSceneText = (scene: typeof MOCK_ANALYSIS.scenes[0]) => {
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
          </CardContent>
        </Card>

        {/* Overall Score */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <div className="text-center">
                <ScoreBadge score={MOCK_ANALYSIS.overallScore} size="lg" className="mb-2" />
                <p className="text-sm font-medium">Overall Score</p>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Comment
                </h3>
                <p className="text-sm text-muted-foreground italic border-l-4 border-primary pl-4">
                  {MOCK_ANALYSIS.aiComment}
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
            {MOCK_ANALYSIS.scenes.map(scene => (
              <div key={scene.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">Scene {scene.id}</Badge>
                    <ScoreBadge score={scene.score} size="sm" />
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
                      <p className="text-sm p-4 bg-muted rounded-lg">{scene.text}</p>
                    </TabsContent>
                    {scene.variants.map((variant, idx) => (
                      <TabsContent key={idx} value={idx.toString()}>
                        <p className="text-sm p-4 bg-muted rounded-lg">{variant}</p>
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
          <Button variant="outline" size="lg">
            <FileText className="h-4 w-4 mr-2" />
            Export Script
          </Button>
          <Button size="lg" onClick={handleProceed} data-testid="button-proceed-stage4">
            Continue to Voice Generation
          </Button>
        </div>
      </div>
    </div>
  )
}
