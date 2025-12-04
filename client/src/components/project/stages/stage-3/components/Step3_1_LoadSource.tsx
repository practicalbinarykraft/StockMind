import { useState } from "react"
import { type Project } from "@shared/schema"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, FileText, Sparkles, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Step3_1_LoadSourceProps {
  project: Project
  stepData: any
  onGenerate: (data: { sourceContent: string; format: string; customPrompt?: string }) => void
  onBack?: () => void
  isLoading?: boolean
}

const FORMATS = [
  { value: "news_update", label: "News Update", description: "Новостной формат" },
  { value: "hook_story", label: "Hook & Story", description: "Хук + история" },
  { value: "explainer", label: "Explainer", description: "Объясняющий формат" },
  { value: "listicle", label: "Listicle", description: "Список" },
]

export function Step3_1_LoadSource({ 
  project, 
  stepData, 
  onGenerate, 
  onBack,
  isLoading = false 
}: Step3_1_LoadSourceProps) {
  const { toast } = useToast()
  const [format, setFormat] = useState(stepData?.format || stepData?.recommendedFormat || "news_update")
  const [customPrompt, setCustomPrompt] = useState(stepData?.customPrompt || "")
  const [customText, setCustomText] = useState(stepData?.text || stepData?.content || "")
  const [isExpanded, setIsExpanded] = useState(false)

  // Get content based on source type
  const getSourceContent = () => {
    if (project.sourceType === "custom") {
      return customText
    }
    return stepData?.content || stepData?.text || stepData?.transcription || ""
  }

  const sourceContent = getSourceContent()
  const sourceType = project.sourceType

  // Get preview content (first 2-3 sentences)
  const getPreviewText = (text: string) => {
    const sentences = text.split(/[.!?]\s+/).filter(Boolean)
    return sentences.slice(0, 3).join(". ") + (sentences.length > 3 ? "..." : "")
  }

  const handleGenerate = () => {
    const content = sourceType === "custom" ? customText : sourceContent
    if (!content.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите текст для генерации сценария",
        variant: "destructive",
      })
      return
    }
    
    if (!format) {
      toast({
        title: "Ошибка",
        description: "Выберите формат сценария",
        variant: "destructive",
      })
      return
    }
    
    onGenerate({
      sourceContent: content,
      format,
      customPrompt: customPrompt.trim() || undefined,
    })
  }

  const canGenerate = sourceType === "custom" 
    ? customText.trim().length > 0 && format
    : sourceContent.trim().length > 0 && format

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Сценарий</h1>
          <p className="text-muted-foreground">Шаг 1 из 2: Загрузите материал для создания сценария</p>
        </div>
      </div>

      {/* Source Preview Card (for News/Instagram) */}
      {sourceType !== "custom" && sourceContent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {sourceType === "news" && <FileText className="h-5 w-5 text-primary" />}
                {sourceType === "instagram" && <FileText className="h-5 w-5 text-primary" />}
                <CardTitle className="text-lg">
                  {sourceType === "news" ? "Выбранная статья" : "Выбранный рилс"}
                </CardTitle>
              </div>
              {stepData?.aiScore && (
                <Badge variant="secondary">
                  Потенциал: {stepData.aiScore}/100
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stepData?.title && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-1">
                    {stepData.title}
                  </h3>
                </div>
              )}
              <div className="text-sm text-foreground">
                {isExpanded ? (
                  <div className="space-y-2">
                    <p className="whitespace-pre-wrap">{sourceContent}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsExpanded(false)}
                      className="text-xs"
                    >
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Свернуть
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p>{getPreviewText(sourceContent)}</p>
                    {sourceContent.length > 200 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(true)}
                        className="text-xs"
                      >
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Показать полностью
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Text Input (for Custom Script) */}
      {sourceType === "custom" && (
        <Card>
          <CardHeader>
            <CardTitle>Ваш материал</CardTitle>
            <CardDescription>
              Введите текст, идею, или готовый сценарий
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Введите текст, идею, или готовый сценарий..."
              className="min-h-[200px]"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Можно вставить: тему/идею, текст статьи, готовый сценарий, транскрипцию видео
            </p>
          </CardContent>
        </Card>
      )}

      {/* Format Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Формат сценария</CardTitle>
          <CardDescription>
            Выберите формат для генерации сценария
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {FORMATS.map((fmt) => (
              <button
                key={fmt.value}
                onClick={() => setFormat(fmt.value)}
                className={cn(
                  "p-4 rounded-lg border-2 transition-all text-left",
                  format === fmt.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="font-medium text-sm mb-1">{fmt.label}</div>
                <div className="text-xs text-muted-foreground">{fmt.description}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Prompt (Optional) */}
      <Card>
        <CardHeader>
          <CardTitle>Дополнительные указания (опционально)</CardTitle>
          <CardDescription>
            Укажите особые требования к сценарию
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Например: Сделай акцент на батарее. Тон энергичный, для молодёжи. Добавь сравнение с конкурентами."
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* Generate Button */}
      <div className="flex justify-end gap-3">
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            Назад
          </Button>
        )}
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate || isLoading}
          size="lg"
          className="gap-2"
        >
          {isLoading ? (
            <>
              <Sparkles className="h-4 w-4 animate-pulse" />
              Создание...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Создать сценарий
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

