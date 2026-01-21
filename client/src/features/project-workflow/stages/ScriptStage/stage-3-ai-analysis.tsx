import { useState, useEffect } from "react";
import { useToast } from "@/shared/hooks";
import { apiRequest, queryClient } from "@/shared/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Progress } from "@/shared/ui/progress";
import { Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { Step3_2_Constructor } from "./components/Step3_2_Constructor";
import { useStageData } from "../../hooks/useStageData";

/**
 * Unified Stage 3: Script Construction
 * 
 * Works for all source types:
 * - News: generates variants from article content
 * - Instagram: generates variants from transcription
 * - Own idea/text/url: uses already generated variants from CreateScriptScreen
 * 
 * Design based on Step3_2_Constructor - two column layout with scene structure and variants
 */
export function Stage3AIAnalysis() {
  const { project, getStepData } = useStageData();
  const stepData = getStepData(2); // step 2 data (content, title, etc.)
  const step3Data = getStepData(3); // step 3 data (generatedVariants, etc.)
  
  const { toast } = useToast();

  // Get step3 data content (may be nested in .data from DB)
  const step3DataContent = step3Data?.data || step3Data;

  // Check if we have generated variants or direct scenes (Scripts Library)
  const hasGeneratedVariants = !!(
    step3DataContent?.generatedVariants ||
    step3DataContent?.step === "constructor" ||
    (step3DataContent?.scenes?.length > 0) // Scripts Library flow
  );

  // Debug log
  console.log("[Stage3AIAnalysis] Received data:", {
    projectId: project.id,
    sourceType: project.sourceType,
    hasStepData: !!stepData,
    hasStep3Data: !!step3Data,
    step3DataContent,
    hasGeneratedVariants,
  });

  // Initialize state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedData, setGeneratedData] = useState<{
    scenes: any[];
    variants: Record<number, Array<{ id: string; text: string; score?: number }>>;
  } | null>(null);

  // Update generatedData when step3Data changes (e.g., after navigation)
  useEffect(() => {
    if (step3DataContent?.generatedVariants) {
      console.log("[Stage3AIAnalysis] Found generatedVariants, updating state:", {
        scenes: step3DataContent.generatedVariants.scenes?.length,
        variantsKeys: Object.keys(step3DataContent.generatedVariants.variants || {}),
      });
      setGeneratedData({
        scenes: step3DataContent.generatedVariants.scenes || step3DataContent.scenes || [],
        variants: step3DataContent.generatedVariants.variants || step3DataContent.variants || {},
      });
    } else if (step3DataContent?.scenes?.length > 0) {
      // Scripts Library flow: we have scenes but no generatedVariants
      // Create basic variants structure from existing scenes
      console.log("[Stage3AIAnalysis] Found scenes from Scripts Library, creating variants:", {
        scenesCount: step3DataContent.scenes.length,
      });
      
      const scenes = step3DataContent.scenes.map((scene: any, index: number) => ({
        id: String(index + 1),
        type: index === 0 ? 'hook' : (index === step3DataContent.scenes.length - 1 ? 'cta' : 'body'),
        text: scene.text || scene,
      }));

      // Create variants: each scene has one variant (the original text)
      const variants: Record<number, Array<{ id: string; text: string; score?: number }>> = {};
      scenes.forEach((scene: any, index: number) => {
        variants[index] = [{
          id: `v${index}-A`,
          text: scene.text,
          score: 80, // Default score for imported scripts
        }];
      });

      setGeneratedData({
        scenes,
        variants,
      });
    }
  }, [step3Data, step3DataContent?.generatedVariants, step3DataContent?.scenes]);

  // Get content from step data (step 2 or step 3)
  // For own-idea/text/url: content is saved in step 3 by CreateScriptScreen
  // For news/instagram: content is saved in step 2 by proceedMutation
  const getSourceContent = () => {
    return (
      // Check step 3 data first (for own-idea/text/url)
      step3DataContent?.sourceContent ||
      // Then check step 2 data (for news/instagram)
      stepData?.content ||
      stepData?.text ||
      stepData?.transcription ||
      stepData?.sourceContent ||
      ""
    );
  };

  // Get format from step data
  const getFormat = () => {
    return (
      step3DataContent?.format ||
      stepData?.format ||
      stepData?.recommendedFormat ||
      "news_update"
    );
  };

  // Proceed to next stage (Stage 4 - Voice Generation)
  const handleProceedToVoice = async () => {
    try {
      // Update project to stage 4
      await apiRequest("PATCH", `/api/projects/${project.id}`, {
        currentStage: 4,
      });

      // Invalidate and refetch to trigger navigation
      await queryClient.invalidateQueries({
        queryKey: ["/api/projects", project.id],
      });
      await queryClient.refetchQueries({
        queryKey: ["/api/projects", project.id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["/api/projects", project.id, "steps"],
      });

      toast({
        title: "Сценарий сохранён",
        description: "Переход к озвучке...",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось перейти к озвучке",
        variant: "destructive",
      });
    }
  };

  // Generate variants for news/instagram when entering Stage 3
  const generateVariants = async () => {
    const content = getSourceContent();
    const format = getFormat();
    const customPrompt = step3DataContent?.customPrompt || "";

    if (!content) {
      toast({
        title: "Ошибка",
        description: "Нет контента для генерации сценария",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(10);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setGenerationProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      // Generate variants
      const res = await apiRequest("POST", "/api/scripts/generate-variants", {
        sourceText: content,
        prompt: customPrompt,
        format: format,
      });

      clearInterval(progressInterval);
      setGenerationProgress(95);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Не удалось сгенерировать варианты");
      }

      const response = await res.json();
      const result = response.data || response;

      // Save to step 3
      await apiRequest("POST", `/api/projects/${project.id}/steps`, {
        stepNumber: 3,
        data: {
          sourceContent: content,
          format: format,
          customPrompt: customPrompt,
          generatedVariants: {
            scenes: result.scenes || [],
            variants: result.variants || {},
          },
          step: "constructor",
        },
      });

      setGenerationProgress(100);

      // Update state with generated data
      setGeneratedData({
        scenes: result.scenes || [],
        variants: result.variants || {},
      });

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({
        queryKey: ["/api/projects", project.id, "steps"],
      });

      toast({
        title: "Сценарий сгенерирован",
        description: `Создано ${result.scenes?.length || 0} сцен. Выберите варианты для каждой сцены.`,
      });
    } catch (error: any) {
      console.error("Generation error:", error);
      toast({
        title: "Ошибка генерации",
        description: error.message || "Не удалось сгенерировать варианты",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  // Auto-generate variants for news/instagram if not already generated
  useEffect(() => {
    // Skip if already have variants or currently generating
    if (generatedData || isGenerating) {
      return;
    }

    // Check if this is a news/instagram source that needs generation
    const sourceType = project.sourceType;
    const hasContent = !!getSourceContent();

    if ((sourceType === "news" || sourceType === "instagram") && hasContent) {
      console.log("[Stage3AIAnalysis] Auto-generating variants for", sourceType);
      generateVariants();
    }
  }, [generatedData, isGenerating, project.sourceType]);

  // Handle completion from Constructor
  const handleComplete = async (finalScript: {
    scenes: any[];
    selectedVariants: Record<number, string>;
    totalWords: number;
    duration: number;
    aiScore?: number;
  }) => {
    try {
      // Save final script to step 3
      await apiRequest("POST", `/api/projects/${project.id}/steps`, {
        stepNumber: 3,
        data: {
          ...step3DataContent,
          finalScript,
          completed: true,
        },
      });

      // Proceed to next stage (voice generation)
      await handleProceedToVoice();
    } catch (error: any) {
      toast({
        title: "Ошибка сохранения",
        description: error.message || "Не удалось сохранить сценарий",
        variant: "destructive",
      });
    }
  };

  // Handle back - regenerate variants
  const handleBack = () => {
    setGeneratedData(null);
  };

  // === RENDERING ===

  // Mode 1: Generating variants - show loading state
  if (isGenerating) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 p-8">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 animate-pulse text-primary" />
              Создание сценария
            </h1>
            <p className="text-muted-foreground mt-1">
              AI анализирует контент и генерирует варианты сцен
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-6">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">Генерация вариантов...</p>
                <p className="text-sm text-muted-foreground">
                  Это может занять 15-30 секунд
                </p>
              </div>
              <div className="w-full max-w-md space-y-2">
                <Progress value={generationProgress} />
                <p className="text-xs text-muted-foreground text-center">
                  {generationProgress}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mode 2: No variants and no content - show error/prompt
  if (!generatedData && !getSourceContent()) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 p-8">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Создание сценария</h1>
            <p className="text-muted-foreground">
              Не найден контент для создания сценария
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Sparkles className="h-12 w-12 text-muted-foreground" />
              <div className="text-center space-y-2">
                <p className="font-medium">Контент не найден</p>
                <p className="text-sm text-muted-foreground">
                  Вернитесь на предыдущий шаг и выберите источник контента
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Вернуться назад
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mode 3: Has content but no variants - show generate button
  if (!generatedData && getSourceContent()) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 p-8">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6" />
              Создание сценария
            </h1>
            <p className="text-muted-foreground mt-1">
              Готово к генерации вариантов сцен
            </p>
          </div>
        </div>

        {/* Source preview */}
        <Card>
          <CardHeader>
            <CardTitle>Исходный материал</CardTitle>
            <CardDescription>
              {project.sourceType === "news" && "Статья из новостей"}
              {project.sourceType === "instagram" && "Транскрипция рилса"}
              {project.sourceType === "custom" && "Пользовательский текст"}
              {!project.sourceType && "Контент для сценария"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm line-clamp-6 text-muted-foreground whitespace-pre-wrap">
              {getSourceContent().slice(0, 500)}
              {getSourceContent().length > 500 && "..."}
            </div>
            <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                {getSourceContent().split(/\s+/).filter(Boolean).length} слов
              </span>
              <span>•</span>
              <span>Формат: {getFormat()}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={generateVariants}
            className="gap-2"
          >
            <Sparkles className="h-5 w-5" />
            Сгенерировать сценарий
          </Button>
        </div>
      </div>
    );
  }

  // Mode 4: Has variants - show Constructor
  return (
    <Step3_2_Constructor
      scenes={generatedData!.scenes}
      variants={generatedData!.variants}
      onBack={handleBack}
      onComplete={handleComplete}
    />
  );
}
