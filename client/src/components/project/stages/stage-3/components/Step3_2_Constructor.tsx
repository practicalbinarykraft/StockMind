import { useState, useMemo, useEffect } from "react"
import { type Project } from "@shared/schema"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Sparkles, RefreshCw, Edit, CheckCircle2 } from "lucide-react"
import { SceneEditor, type Scene } from "@/components/scripts/scene-editor"
import { SceneVariantCard } from "@/components/scripts/scene-variant-card"
import { useMutation } from "@tanstack/react-query"
import { apiRequest } from "@/lib/query-client"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

interface Step3_2_ConstructorProps {
  project: Project
  step3Data: any
  scenes: Scene[]
  variants: Record<number, Array<{ id: string; text: string; score?: number }>>
  onBack: () => void
  onComplete: (finalScript: {
    scenes: Scene[]
    selectedVariants: Record<number, string>
    totalWords: number
    duration: number
    aiScore?: number
  }) => void
}

export function Step3_2_Constructor({
  project,
  step3Data,
  scenes: initialScenes,
  variants: initialVariants,
  onBack,
  onComplete,
}: Step3_2_ConstructorProps) {
  const { toast } = useToast()
  // Initialize from step3Data if available (restore progress)
  const initialSelectedVariants = step3Data?.finalScript?.selectedVariants || step3Data?.selectedVariants || {}
  
  const [scenes, setScenes] = useState<Scene[]>(initialScenes)
  const [variants, setVariants] = useState(initialVariants)
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0)
  const [selectedVariants, setSelectedVariants] = useState<Record<number, string>>(initialSelectedVariants)
  const [showBackWarning, setShowBackWarning] = useState(false)
  const [finalScore, setFinalScore] = useState<number | null>(step3Data?.finalScript?.aiScore || null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showCustomVariantDialog, setShowCustomVariantDialog] = useState(false)
  const [customVariantText, setCustomVariantText] = useState("")

  // Calculate progress
  const completedScenes = Object.keys(selectedVariants).length
  const totalScenes = scenes.length
  const progress = totalScenes > 0 ? (completedScenes / totalScenes) * 100 : 0

  // Get current scene variants
  const currentVariants = variants[selectedSceneIndex] || []

  // Restore scene texts from selected variants on mount
  useEffect(() => {
    if (Object.keys(initialSelectedVariants).length > 0) {
      const restoredScenes = scenes.map((scene, index) => {
        const variantId = initialSelectedVariants[index]
        if (variantId) {
          // Find variant text
          const variant = variants[index]?.find((v) => v.id === variantId)
          if (variant) {
            return { ...scene, text: variant.text }
          }
        }
        return scene
      })
      setScenes(restoredScenes)
      
      // Set active scene to first uncompleted
      const firstUncompleted = restoredScenes.findIndex((_, idx) => !initialSelectedVariants[idx])
      if (firstUncompleted !== -1) {
        setSelectedSceneIndex(firstUncompleted)
      }
    }
  }, []) // Only on mount

  // Check if all scenes are selected
  const allScenesSelected = useMemo(() => {
    return scenes.every((_, index) => selectedVariants[index] !== undefined)
  }, [scenes, selectedVariants])

  // Save progress to step3Data
  const saveProgress = async (newSelectedVariants: Record<number, string>) => {
    try {
      await apiRequest("POST", `/api/projects/${project.id}/steps`, {
        stepNumber: 3,
        data: {
          ...step3Data,
          selectedVariants: newSelectedVariants,
        },
      })
    } catch (error) {
      console.error("Failed to save progress:", error)
      // Не показываем ошибку пользователю - это промежуточное сохранение
    }
  }

  // Handle variant selection
  const handleSelectVariant = async (variantId: string) => {
    const newSelectedVariants = {
      ...selectedVariants,
      [selectedSceneIndex]: variantId,
    }
    
    setSelectedVariants(newSelectedVariants)

    // Update scene text with selected variant
    const variant = currentVariants.find((v) => v.id === variantId)
    if (variant) {
      setScenes((prev) =>
        prev.map((scene, index) =>
          index === selectedSceneIndex ? { ...scene, text: variant.text } : scene
        )
      )
    }

    // Save progress
    await saveProgress(newSelectedVariants)

    // Auto-advance to next scene if not last
    if (selectedSceneIndex < scenes.length - 1) {
      setTimeout(() => {
        setSelectedSceneIndex(selectedSceneIndex + 1)
      }, 300)
    } else {
      // Last scene selected - analyze final script
      analyzeFinalScript()
    }
  }

  // Handle custom variant (user writes their own)
  const handleCustomVariant = async (customText: string) => {
    if (!customText.trim()) return

    const customVariantId = `custom-${selectedSceneIndex}-${Date.now()}`
    const newSelectedVariants = {
      ...selectedVariants,
      [selectedSceneIndex]: customVariantId,
    }

    setSelectedVariants(newSelectedVariants)
    
    // Update scene text
    setScenes((prev) =>
      prev.map((scene, index) =>
        index === selectedSceneIndex ? { ...scene, text: customText } : scene
      )
    )

    // Add custom variant to variants list
    setVariants((prev) => ({
      ...prev,
      [selectedSceneIndex]: [
        ...(prev[selectedSceneIndex] || []),
        { id: customVariantId, text: customText, score: undefined }
      ]
    }))

    // Save progress
    await saveProgress(newSelectedVariants)
    setShowCustomVariantDialog(false)

    // Auto-advance
    if (selectedSceneIndex < scenes.length - 1) {
      setTimeout(() => {
        setSelectedSceneIndex(selectedSceneIndex + 1)
      }, 300)
    } else {
      analyzeFinalScript()
    }
  }

  // Analyze final script after all scenes selected
  const analyzeFinalScript = async () => {
    setIsAnalyzing(true)
    try {
      const finalScriptText = scenes.map((s) => s.text).join("\n\n")
      
      // Call analysis API
      const res = await apiRequest("POST", "/api/ai/analyze-script", {
        format: step3Data?.format || "news_update",
        content: finalScriptText,
      })

      const data = await res.json()
      const score = data.overallScore || data.score || null
      setFinalScore(score)
    } catch (error) {
      console.error("Failed to analyze script:", error)
      toast({
        title: "Ошибка анализа",
        description: "Не удалось проанализировать сценарий",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Regenerate variants for current scene
  const regenerateVariantsMutation = useMutation({
    mutationFn: async () => {
      const currentScene = scenes[selectedSceneIndex]
      const res = await apiRequest("POST", "/api/scripts/generate-variants", {
        sourceText: currentScene.text,
        prompt: step3Data?.customPrompt || "",
        format: step3Data?.format || "news_update",
      })

      const data = await res.json()
      return data.data || data
    },
    onSuccess: (data) => {
      const newVariants = data.variants?.[0] || []
      setVariants((prev) => ({
        ...prev,
        [selectedSceneIndex]: newVariants,
      }))
      toast({
        title: "Варианты обновлены",
        description: "Новые варианты для текущей сцены сгенерированы",
      })
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось сгенерировать новые варианты",
        variant: "destructive",
      })
    },
  })

  // Calculate totals
  const totalWords = scenes.reduce(
    (sum, scene) => sum + scene.text.split(/\s+/).filter(Boolean).length,
    0
  )
  const totalDuration = Math.ceil(totalWords / 2.5)

  // Handle complete
  const handleComplete = () => {
    onComplete({
      scenes,
      selectedVariants,
      totalWords,
      duration: totalDuration,
      aiScore: finalScore || undefined,
    })
  }

  // Handle back with warning
  const handleBackClick = () => {
    if (completedScenes > 0) {
      setShowBackWarning(true)
    } else {
      onBack()
    }
  }

  const confirmBack = () => {
    setShowBackWarning(false)
    onBack()
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBackClick}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Сценарий</h1>
          <p className="text-muted-foreground">Шаг 2 из 2: Соберите идеальный сценарий из вариантов</p>
        </div>
        <div className="text-sm text-muted-foreground">
          Прогресс: {completedScenes}/{totalScenes} сцен
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Прогресс сборки</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Main Content: Script Structure + Variants */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Script Structure */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Структура сценария</CardTitle>
              <CardDescription>
                Выберите сцену для редактирования
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {scenes.map((scene, index) => {
                const isSelected = index === selectedSceneIndex
                const isCompleted = selectedVariants[index] !== undefined

                return (
                  <div
                    key={scene.id}
                    className={cn(
                      "border rounded-lg p-4 transition-all cursor-pointer",
                      isSelected
                        ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                        : "border-border hover:border-primary/50",
                      isCompleted && "bg-muted/30"
                    )}
                    onClick={() => setSelectedSceneIndex(index)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Scene {index + 1}</span>
                        <Badge variant="outline">
                          {scene.type === "hook" ? "Hook" : scene.type === "cta" ? "CTA" : "Body"}
                        </Badge>
                        {isCompleted && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>
                    {isSelected && !isCompleted && (
                      <p className="text-sm text-muted-foreground">
                        ⚡ Выберите вариант справа →
                      </p>
                    )}
                    {isCompleted ? (
                      <p className="text-sm mt-2 line-clamp-2">{scene.text}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-2">
                        {isSelected ? "Выберите вариант справа" : "Ожидает выбора"}
                      </p>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Итого:</span>
                  <span className="font-medium">
                    {totalScenes} сцен • {totalWords} слов • ~{totalDuration} сек
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Variants for Selected Scene */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Варианты: Scene {selectedSceneIndex + 1}</CardTitle>
                  <CardDescription>
                    Выберите лучший вариант для этой сцены
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => regenerateVariantsMutation.mutate()}
                  disabled={regenerateVariantsMutation.isPending}
                >
                  <RefreshCw className={cn(
                    "h-4 w-4 mr-2",
                    regenerateVariantsMutation.isPending && "animate-spin"
                  )} />
                  Другие варианты
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentVariants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Варианты загружаются...</p>
                </div>
              ) : (
                currentVariants.map((variant, index) => {
                  const label = String.fromCharCode(65 + index) // A, B, C
                  const isSelected = selectedVariants[selectedSceneIndex] === variant.id

                  return (
                    <SceneVariantCard
                      key={variant.id}
                      variant={variant}
                      label={label}
                      isSelected={isSelected}
                      onSelect={() => handleSelectVariant(variant.id)}
                    />
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* Final Score (after all selected) */}
          {allScenesSelected && finalScore !== null && (
            <Card>
              <CardHeader>
                <CardTitle>AI Оценка</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2">{finalScore}/100</div>
                    <Badge
                      variant={
                        finalScore >= 80
                          ? "default"
                          : finalScore >= 60
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {finalScore >= 80
                        ? "Отличный сценарий"
                        : finalScore >= 60
                        ? "Хороший сценарий"
                        : "Рекомендуем улучшить"}
                    </Badge>
                  </div>
                  {finalScore < 60 && (
                    <p className="text-sm text-muted-foreground text-center">
                      💡 Рекомендуем улучшить сценарий перед озвучкой
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {isAnalyzing && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  <span>Анализ сценария...</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleBackClick}>
          Назад
        </Button>
        <Button
          onClick={handleComplete}
          disabled={!allScenesSelected || isAnalyzing}
          size="lg"
        >
          Сохранить и продолжить →
        </Button>
      </div>

      {/* Back Warning Dialog */}
      <AlertDialog open={showBackWarning} onOpenChange={setShowBackWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вернуться на предыдущий шаг?</AlertDialogTitle>
            <AlertDialogDescription>
              Если вернуться на предыдущий шаг, собранный сценарий будет потерян.
              Вы уверены?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBack} variant="destructive">
              Вернуться
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Custom Variant Dialog */}
      <Dialog 
        open={showCustomVariantDialog} 
        onOpenChange={(open) => {
          setShowCustomVariantDialog(open)
          if (open) {
            setCustomVariantText(scenes[selectedSceneIndex]?.text || "")
          } else {
            setCustomVariantText("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Написать свой вариант</DialogTitle>
            <DialogDescription>
              Введите свой текст для Scene {selectedSceneIndex + 1}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Введите текст сцены..."
              className="min-h-[150px]"
              value={customVariantText}
              onChange={(e) => setCustomVariantText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  handleCustomVariant(customVariantText)
                }
              }}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {customVariantText.split(/\s+/).filter(Boolean).length} слов
              </span>
              <span>
                ~{Math.ceil(customVariantText.split(/\s+/).filter(Boolean).length / 2.5)} сек
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomVariantDialog(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => {
                if (customVariantText.trim()) {
                  handleCustomVariant(customVariantText.trim())
                } else {
                  toast({
                    title: "Ошибка",
                    description: "Введите текст для варианта",
                    variant: "destructive",
                  })
                }
              }}
            >
              Использовать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

