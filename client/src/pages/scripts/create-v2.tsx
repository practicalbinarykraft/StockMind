import { useState } from "react"
import { useLocation } from "wouter"
import { useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/shared/api"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { Textarea } from "@/shared/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/shared/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"
import { ArrowLeft, FileText, Loader2, Plus, Sparkles } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Layout } from "@/components/layout/layout"
import { SceneEditor, type Scene } from "@/features/project-workflow/components/SceneEditor"
import { SceneVariantCard } from "@/shared/components/scene-variant-card"
import { Badge } from "@/shared/ui/badge"
import { Progress } from "@/shared/ui/progress"
import { cn } from "@/shared/utils"

type Step = 'input' | 'builder'

function ScriptCreateV2Content() {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const [step, setStep] = useState<Step>('input')
  
  // Step 1: Input data
  const [sourceText, setSourceText] = useState("")
  const [prompt, setPrompt] = useState("")
  const [format, setFormat] = useState("news_update")
  const [sourceType, setSourceType] = useState("custom")
  
  // Step 2: Builder data
  const [scenes, setScenes] = useState<Scene[]>([])
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number | null>(null)
  const [variants, setVariants] = useState<Record<number, Array<{ id: string; text: string; score?: number }>>>({})
  const [selectedVariants, setSelectedVariants] = useState<Record<number, string>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)

  // Generate script variants
  const generateMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true)
      setGenerationProgress(0)
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setGenerationProgress((prev) => Math.min(prev + 10, 90))
      }, 500)

      try {
        // Call AI API to generate variants
        const res = await apiRequest("POST", "/api/scripts/generate-variants", {
          body: JSON.stringify({
            sourceText,
            prompt,
            format,
          }),
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || "Не удалось сгенерировать варианты")
        }

        clearInterval(progressInterval)
        setGenerationProgress(100)

        const response = await res.json()
        const data = response.data || response

        // Transform response to our format
        const generatedScenes: Scene[] = data.scenes || []
        const generatedVariants = data.variants || {}

        setScenes(generatedScenes)
        setVariants(generatedVariants)
        setSelectedSceneIndex(0)
        setStep('builder')
      } catch (error: any) {
        clearInterval(progressInterval)
        setIsGenerating(false)
        setGenerationProgress(0)
        throw error
      } finally {
        clearInterval(progressInterval)
        setIsGenerating(false)
        setGenerationProgress(0)
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка генерации",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  // Create script mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!sourceText.trim()) {
        throw new Error("Введите исходный текст")
      }

      // Use selected variants or scene text
      const finalScenes = scenes.map((scene, index) => {
        const selectedVariantId = selectedVariants[index]
        const selectedVariant = selectedVariantId 
          ? variants[index]?.find(v => v.id === selectedVariantId)
          : null
        
        return {
          sceneNumber: index + 1,
          text: selectedVariant?.text || scene.text || '',
          start: 0,
          end: 0,
          duration: 5,
        }
      }).filter(s => s.text.trim())

      if (finalScenes.length === 0) {
        throw new Error("Добавьте хотя бы одну сцену")
      }

      const fullText = finalScenes.map((s) => s.text).join("\n")
      const wordCount = fullText.split(/\s+/).filter(Boolean).length
      const durationSeconds = finalScenes.reduce((sum, s) => sum + (s.duration || 5), 0)

      // Generate title from first scene or use default
      const firstSceneText = finalScenes[0]?.text || ''
      const generatedTitle = firstSceneText.length > 50 
        ? firstSceneText.substring(0, 50) + '...'
        : firstSceneText || `Script ${new Date().toLocaleDateString()}`

      const res = await apiRequest("POST", "/api/scripts", {
        body: JSON.stringify({
          title: generatedTitle,
          scenes: finalScenes,
          fullText,
          format,
          durationSeconds,
          wordCount,
          sourceType,
          status: "draft",
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Не удалось создать скрипт")
      }

      const response = await res.json()
      return response.data || response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scripts"] })
      toast({
        title: "Скрипт создан",
        description: "Скрипт успешно добавлен в библиотеку",
      })
      setLocation("/scripts")
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const handleSelectVariant = (sceneIndex: number, variantId: string) => {
    setSelectedVariants(prev => ({ ...prev, [sceneIndex]: variantId }))
    const variant = variants[sceneIndex]?.find(v => v.id === variantId)
    if (variant) {
      setScenes(prev => prev.map((s, i) => 
        i === sceneIndex ? { ...s, text: variant.text } : s
      ))
    }
  }

  const totalWords = scenes.reduce(
    (sum, s) => {
      const selectedVariantId = selectedVariants[scenes.indexOf(s)]
      const selectedVariant = selectedVariantId 
        ? variants[scenes.indexOf(s)]?.find(v => v.id === selectedVariantId)
        : null
      const text = selectedVariant?.text || s.text
      return sum + text.split(/\s+/).filter(Boolean).length
    },
    0
  )
  const totalDuration = Math.ceil(totalWords / 2.5)
  const completedScenes = scenes.filter((s, i) => {
    const selectedVariantId = selectedVariants[i]
    const selectedVariant = selectedVariantId 
      ? variants[i]?.find(v => v.id === selectedVariantId)
      : null
    return (selectedVariant?.text || s.text).trim().length > 0
  }).length

  if (step === 'input') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/scripts")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Создать новый скрипт</h1>
            <p className="text-muted-foreground mt-1">
              Добавьте исходный текст и промпт для AI генерации
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Исходный материал</CardTitle>
            <CardDescription>
              Введите текст, который нужно превратить в сценарий
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Source Text */}
            <div className="space-y-2">
              <Label htmlFor="sourceText">Исходный текст *</Label>
              <Textarea
                id="sourceText"
                placeholder="Вставьте текст статьи, новости или любой другой контент..."
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                className="min-h-[200px]"
              />
            </div>

            {/* Prompt */}
            <div className="space-y-2">
              <Label htmlFor="prompt">Промпт для AI (опционально)</Label>
              <Textarea
                id="prompt"
                placeholder="Например: Сделай акцент на батарее. Целевая аудитория - молодёжь. Тон - энергичный, с FOMO."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            {/* Format and Source Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="format">Формат видео</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger id="format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="news_update">📰 News Update</SelectItem>
                    <SelectItem value="explainer">📚 Explainer</SelectItem>
                    <SelectItem value="hook_story">🎯 Hook & Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sourceType">Тип источника</Label>
                <Select value={sourceType} onValueChange={setSourceType}>
                  <SelectTrigger id="sourceType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom</SelectItem>
                    <SelectItem value="rss">News</SelectItem>
                    <SelectItem value="reddit">Reddit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setLocation("/scripts")}
            >
              Отмена
            </Button>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={!sourceText.trim() || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Генерация...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Сгенерировать варианты
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Generation Progress */}
        {isGenerating && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Генерируем варианты сценария...</span>
                  <span className="text-sm text-muted-foreground">{generationProgress}%</span>
                </div>
                <Progress value={generationProgress} />
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>🎬 Анализируем исходный текст...</div>
                  <div>🎯 Определяем структуру сцен...</div>
                  <div>✨ Генерируем варианты...</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Builder step
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setStep('input')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Конструктор сценария</h1>
            <p className="text-muted-foreground text-sm">
              Выберите лучшие варианты для каждой сцены
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Сохранение...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Сохранить скрипт
            </>
          )}
        </Button>
      </div>

      {/* Progress Bar */}
      {scenes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Прогресс сборки сценария</span>
            <span className="font-medium">{completedScenes}/{scenes.length} сцен</span>
          </div>
          <Progress value={scenes.length > 0 ? (completedScenes / scenes.length) * 100 : 0} />
        </div>
      )}

      {/* Builder Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Assembled Script */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">📋 Собранный сценарий</h2>
            <Badge variant="outline">
              {completedScenes}/{scenes.length} сцен
            </Badge>
          </div>
          
          <div className="space-y-3">
            {scenes.map((scene, index) => {
              const selectedVariantId = selectedVariants[index]
              const selectedVariant = selectedVariantId 
                ? variants[index]?.find(v => v.id === selectedVariantId)
                : null
              const displayText = selectedVariant?.text || scene.text
              const isSelected = selectedSceneIndex === index

              return (
                <Card 
                  key={scene.id}
                  className={cn(
                    "cursor-pointer transition-all",
                    isSelected && "border-primary ring-2 ring-primary/20"
                  )}
                  onClick={() => setSelectedSceneIndex(index)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Scene {index + 1}</span>
                        <Badge variant="outline">{scene.type}</Badge>
                        {selectedVariant && (
                          <Badge variant="default">✓</Badge>
                        )}
                      </div>
                    </div>
                    {displayText ? (
                      <p className="text-sm">{displayText}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        ⚡ Выберите вариант справа
                      </p>
                    )}
                    {displayText && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {displayText.split(/\s+/).filter(Boolean).length} слов • ~{Math.ceil(displayText.split(/\s+/).filter(Boolean).length / 2.5)} сек
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">
                Итого: {completedScenes} сцен • {totalWords} слов • ~{totalDuration} сек
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Variants */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            🎯 Варианты для: Scene {selectedSceneIndex !== null ? selectedSceneIndex + 1 : '?'}
          </h2>
          
          {selectedSceneIndex !== null && variants[selectedSceneIndex] ? (
            <div className="space-y-3">
              {variants[selectedSceneIndex].map((variant, vIndex) => (
                <SceneVariantCard
                  key={variant.id}
                  variant={variant}
                  label={String.fromCharCode(65 + vIndex)}
                  isSelected={selectedVariants[selectedSceneIndex] === variant.id}
                  onSelect={() => handleSelectVariant(selectedSceneIndex, variant.id)}
                />
              ))}
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  // TODO: Regenerate variants for selected scene
                  toast({
                    title: "Скоро",
                    description: "Функция регенерации вариантов будет доступна в следующей версии",
                  })
                }}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Сгенерировать другие варианты
              </Button>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Выберите сцену слева, чтобы увидеть варианты
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ScriptCreateV2() {
  return (
    <Layout>
      <ScriptCreateV2Content />
    </Layout>
  )
}

