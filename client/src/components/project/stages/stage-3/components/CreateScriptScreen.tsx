import { useState } from "react";
import { type Project } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Lightbulb,
  FileText,
  Link2,
  BookOpen,
  Newspaper,
  Instagram,
  ChevronDown,
  ChevronUp,
  Settings,
  ArrowLeft,
  Loader2,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/query-client";

interface CreateScriptScreenProps {
  project: Project;
  stepData: any;
  onGenerate: (data: {
    sourceContent: string;
    format: string;
    customPrompt?: string;
    sourceType: string;
  }) => void;
  onBack?: () => void;
  isLoading?: boolean;
}

type SourceType = "idea" | "text" | "url" | "library" | null;

const FORMATS = [
  {
    value: "news_update",
    label: "News Update",
    icon: "📰",
    duration: "15-20 сек",
    description: "Новостной формат",
  },
  {
    value: "hook_story",
    label: "Hook & Story",
    icon: "🎯",
    duration: "30-45 сек",
    description: "Хук + история",
  },
  {
    value: "explainer",
    label: "Explainer",
    icon: "📊",
    duration: "45-60 сек",
    description: "Объясняющий формат",
  },
  {
    value: "listicle",
    label: "Топ-5",
    icon: "📋",
    duration: "45-60 сек",
    description: "Список",
  },
  {
    value: "comparison",
    label: "A vs B",
    icon: "🆚",
    duration: "30-45 сек",
    description: "Сравнение",
  },
  {
    value: "shock",
    label: "Шок",
    icon: "😱",
    duration: "15-30 сек",
    description: "Шокирующий контент",
  },
];

const EXAMPLE_IDEAS = [
  "iPhone 16 батарея",
  "AI заменит работу",
  "Крипто 2024",
  "GTA 6",
  "ChatGPT 5",
  "Tesla новости",
  "Метавселенная",
  "Web3",
];

const TRENDING_TOPICS = EXAMPLE_IDEAS;

export function CreateScriptScreen({
  project,
  stepData,
  onGenerate,
  onBack,
  isLoading = false,
}: CreateScriptScreenProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [selectedSource, setSelectedSource] = useState<SourceType>(null);
  const [ideaText, setIdeaText] = useState("");
  const [customText, setCustomText] = useState("");
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [parsedUrlContent, setParsedUrlContent] = useState<{
    title: string;
    source: string;
    wordCount: number;
  } | null>(null);
  const [isParsingUrl, setIsParsingUrl] = useState(false);
  const [showAllFormats, setShowAllFormats] = useState(false);

  // Mutation for handling source selection and navigation
  const handleSourceAndGenerate = useMutation({
    mutationFn: async (data: {
      sourceContent: string;
      format: string;
      customPrompt?: string;
      sourceType: string;
    }) => {
      // Determine target stage based on source type
      // For News/Instagram - go to stage 2 (content selection)
      // For others (idea, text, url, library) - go directly to stage 3 (constructor)
      const isNewsOrInstagram =
        data.sourceType === "news" || data.sourceType === "instagram";
      const targetStage = isNewsOrInstagram ? 2 : 3;

      // Save step 1 data
      await apiRequest("POST", `/api/projects/${project.id}/steps`, {
        stepNumber: 1,
        data: {
          sourceChoice: data.sourceType,
          sourceContent: data.sourceContent,
          format: data.format,
          customPrompt: data.customPrompt,
        },
        completedAt: new Date().toISOString(),
      });

      // Update project stage and source type
      await apiRequest("PATCH", `/api/projects/${project.id}`, {
        currentStage: targetStage,
        sourceType: data.sourceType,
      });

      // If going directly to stage 3 (not News/Instagram), also create step 2 as skipped
      if (targetStage === 3) {
        await apiRequest("POST", `/api/projects/${project.id}/steps`, {
          stepNumber: 2,
          data: {
            skipped: true,
            skipReason: `${data.sourceType} - content input skipped`,
          },
          completedAt: new Date().toISOString(),
        });

        // Generate variants immediately for non-News/Instagram sources
        // Call the generation API using apiRequest (which handles auth automatically)
        try {
          const res = await apiRequest(
            "POST",
            "/api/scripts/generate-variants",
            {
              sourceText: data.sourceContent,
              prompt: data.customPrompt || "",
              format: data.format,
            }
          );

          const response = await res.json();
          const result = response.data || response;

          // Save step 3 data with generated variants and step: "constructor"
          await apiRequest("POST", `/api/projects/${project.id}/steps`, {
            stepNumber: 3,
            data: {
              sourceContent: data.sourceContent,
              format: data.format,
              customPrompt: data.customPrompt,
              generatedVariants: {
                scenes: result.scenes || [],
                variants: result.variants || {},
              },
              step: "constructor",
            },
          });

          // Call onGenerate callback if provided (for navigation)
          if (onGenerate) {
            await onGenerate(data);
          }
        } catch (error: any) {
          console.error("Generation error:", error);
          toast({
            title: "Ошибка генерации",
            description: error.message || "Не удалось сгенерировать варианты",
            variant: "destructive",
          });
          throw error; // Re-throw to prevent navigation on error
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", project.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", project.id, "steps"],
      });
      setIsGenerating(false);
      setLocation(`/project/${project.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать проект",
        variant: "destructive",
      });
      setIsGenerating(false);
    },
  });

  // Get content based on selected source
  const getContent = () => {
    switch (selectedSource) {
      case "idea":
        return ideaText;
      case "text":
        return customText;
      case "url":
        // For URL, use parsed content if available, otherwise use URL
        return parsedUrlContent
          ? `${parsedUrlContent.title}\n${parsedUrlContent.source}`
          : url;
      case "library":
        return selectedTopics.join(", ");
      default:
        return "";
    }
  };

  const content = getContent();

  const handleGenerate = () => {
    if (!selectedSource) {
      toast({
        title: "Ошибка",
        description: "Выберите источник контента",
        variant: "destructive",
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите контент для генерации",
        variant: "destructive",
      });
      return;
    }

    if (!format) {
      toast({
        title: "Ошибка",
        description: "Выберите формат сценария",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    handleSourceAndGenerate.mutate({
      sourceContent: content,
      format,
      customPrompt: customPrompt.trim() || undefined,
      sourceType: selectedSource,
    });
  };

  // Handle News/Instagram navigation
  const handleNewsClick = () => {
    handleSourceAndGenerate.mutate({
      sourceContent: "",
      format: "news_update",
      sourceType: "news",
    });
  };

  const handleInstagramClick = () => {
    handleSourceAndGenerate.mutate({
      sourceContent: "",
      format: "news_update",
      sourceType: "instagram",
    });
  };

  const handleTopicClick = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter((t) => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  // Handle URL parsing
  const handleParseUrl = async () => {
    if (!url.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите URL",
        variant: "destructive",
      });
      return;
    }

    setIsParsingUrl(true);
    try {
      // TODO: Implement actual URL parsing API
      // For now, simulate parsing
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock parsed content
      setParsedUrlContent({
        title: "Заголовок статьи",
        source: new URL(url).hostname,
        wordCount: 847,
      });

      toast({
        title: "Контент загружен",
        description: "Статья успешно извлечена",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось загрузить контент",
        variant: "destructive",
      });
    } finally {
      setIsParsingUrl(false);
    }
  };

  // Calculate text stats for "Свой текст"
  const textStats = customText.trim()
    ? {
        words: customText.split(/\s+/).filter(Boolean).length,
        chars: customText.length,
      }
    : null;

  const canGenerate = selectedSource && content.trim().length > 0 && format;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Выбор источника
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Выберите откуда будет взят контент для создания сценария
          </p>
        </div>
      </div>

      {/* Source Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Откуда берём контент?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <button
              onClick={() => setSelectedSource("idea")}
              className={cn(
                "p-4 rounded-lg border-2 transition-all text-left",
                selectedSource === "idea"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="text-2xl mb-2">💡</div>
              <div className="font-medium text-sm mb-1">Своя идея</div>
              <div className="text-xs text-muted-foreground">Опишу тему</div>
              {selectedSource === "idea" && (
                <div className="mt-2">
                  <Badge variant="default" className="text-xs">
                    ✓
                  </Badge>
                </div>
              )}
            </button>

            <button
              onClick={() => setSelectedSource("text")}
              className={cn(
                "p-4 rounded-lg border-2 transition-all text-left",
                selectedSource === "text"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="text-2xl mb-2">📄</div>
              <div className="font-medium text-sm mb-1">Свой текст</div>
              <div className="text-xs text-muted-foreground">Вставлю текст</div>
              {selectedSource === "text" && (
                <div className="mt-2">
                  <Badge variant="default" className="text-xs">
                    ✓
                  </Badge>
                </div>
              )}
            </button>

            <button
              onClick={() => setSelectedSource("url")}
              className={cn(
                "p-4 rounded-lg border-2 transition-all text-left",
                selectedSource === "url"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="text-2xl mb-2">🔗</div>
              <div className="font-medium text-sm mb-1">Ссылка</div>
              <div className="text-xs text-muted-foreground">
                URL статьи/видео
              </div>
              {selectedSource === "url" && (
                <div className="mt-2">
                  <Badge variant="default" className="text-xs">
                    ✓
                  </Badge>
                </div>
              )}
            </button>

            <button
              onClick={() => setSelectedSource("library")}
              className={cn(
                "p-4 rounded-lg border-2 transition-all text-left",
                selectedSource === "library"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="text-2xl mb-2">📚</div>
              <div className="font-medium text-sm mb-1 flex items-center gap-1">
                Библиотека
                <Badge variant="secondary" className="text-xs">
                  PRO ⭐
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">Готовые темы</div>
              {selectedSource === "library" && (
                <div className="mt-2">
                  <Badge variant="default" className="text-xs">
                    ✓
                  </Badge>
                </div>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                или выберите источник
              </span>
            </div>
          </div>

          {/* News and Instagram */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              className="cursor-pointer hover:border-primary transition-all"
              onClick={handleNewsClick}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Newspaper className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">Новости</div>
                      <div className="text-xs text-muted-foreground">
                        247 статей • 12 hot
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={handleSourceAndGenerate.isPending}
                  >
                    Выбрать →
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:border-primary transition-all"
              onClick={handleInstagramClick}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Instagram className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">Instagram Reels</div>
                      <div className="text-xs text-muted-foreground">
                        Транскрипции рилсов
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={handleSourceAndGenerate.isPending}
                  >
                    Выбрать →
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Layers - appear after source selection */}
      {selectedSource && (
        <>
          {/* Content Input Layer */}
          <Card>
            <CardHeader>
              <CardTitle>Ваш контент</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedSource === "idea" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Опишите идею коротко
                    </label>
                    <Input
                      value={ideaText}
                      onChange={(e) => setIdeaText(e.target.value)}
                      placeholder="О чём будет видео? Например: iPhone 16 и его батарея"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      💡 Примеры идей (нажмите чтобы использовать):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {EXAMPLE_IDEAS.map((idea) => (
                        <Button
                          key={idea}
                          variant="outline"
                          size="sm"
                          onClick={() => setIdeaText(idea)}
                          className="h-8 text-xs"
                        >
                          {idea}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedSource === "text" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Вставьте текст
                    </label>
                    <Textarea
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      placeholder="Вставьте текст статьи, транскрипцию или готовый сценарий..."
                      className="min-h-[200px]"
                    />
                  </div>
                  {textStats && (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm font-medium mb-1">
                        📊 Определено:
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {textStats.words} слов • {textStats.chars} символов
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedSource === "url" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      URL статьи или видео
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={url}
                        onChange={(e) => {
                          setUrl(e.target.value);
                          setParsedUrlContent(null); // Reset on change
                        }}
                        placeholder="https://example.com/article"
                        type="url"
                        className="flex-1"
                      />
                      <Button
                        onClick={handleParseUrl}
                        disabled={isParsingUrl || !url.trim()}
                      >
                        {isParsingUrl ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Загрузить"
                        )}
                      </Button>
                    </div>
                  </div>

                  {parsedUrlContent && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Globe className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm mb-1">
                              {parsedUrlContent.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {parsedUrlContent.source} •{" "}
                              {parsedUrlContent.wordCount} слов
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {!parsedUrlContent && (
                    <p className="text-xs text-muted-foreground">
                      Вставьте ссылку на статью или видео. Мы извлечём контент
                      автоматически.
                    </p>
                  )}
                </div>
              )}

              {selectedSource === "library" && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
                    <div className="text-center">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium mb-1">Библиотека PRO</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Скоро! Подпишитесь чтобы узнать первым
                      </p>
                      <Button variant="outline" size="sm">
                        Узнать больше
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Format Selection Layer */}
          <Card>
            <CardHeader>
              <CardTitle>Выберите формат</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {FORMATS.map((fmt) => (
                  <button
                    key={fmt.value}
                    onClick={() => setFormat(fmt.value)}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-all text-left",
                      format === fmt.value
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="text-xl mb-1">{fmt.icon}</div>
                    <div className="font-medium text-xs mb-1">{fmt.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmt.duration}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Advanced Settings Layer */}
          <Card>
            <CardHeader>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full"
              >
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Дополнительные настройки
                </CardTitle>
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </CardHeader>
            {showAdvanced && (
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Дополнительные указания (опционально)
                    </label>
                    <Textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Например: Сделай акцент на батарее. Тон энергичный, для молодёжи. Добавь сравнение с конкурентами."
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            {onBack && (
              <Button variant="outline" onClick={onBack}>
                Отмена
              </Button>
            )}
            <Button
              onClick={handleGenerate}
              disabled={
                !canGenerate ||
                isLoading ||
                handleSourceAndGenerate.isPending ||
                isGenerating
              }
              size="lg"
              className="gap-2"
            >
              {isLoading ||
              handleSourceAndGenerate.isPending ||
              isGenerating ? (
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
        </>
      )}
    </div>
  );
}
