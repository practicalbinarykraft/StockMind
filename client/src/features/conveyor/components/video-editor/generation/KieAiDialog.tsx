/**
 * Диалог для генерации контента через Kie.ai
 * Поддерживает генерацию изображений, видео и image-to-video
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Loader2, Sparkles } from "lucide-react";
import {
  useCompositionStore,
  selectProjectAspectRatio,
} from "../../../stores/composition";
import type { KieModel } from "../../../types/layers";

interface KieAiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layerType: "background" | "overlay";
  sceneId: string;
}

export function KieAiDialog({
  open,
  onOpenChange,
  layerType,
  sceneId,
}: KieAiDialogProps) {
  const generateContent = useCompositionStore((state) => state.generateContent);
  const projectAspectRatio = useCompositionStore(selectProjectAspectRatio);

  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<KieModel>("flux-pro");
  const [generationType, setGenerationType] = useState<"image" | "video">(
    "image",
  );
  const [aspectRatio, setAspectRatio] = useState<
    "16:9" | "9:16" | "1:1" | "2:3" | "3:4" | "4:5" | "3:2" | "4:3" | "5:4"
  >(projectAspectRatio);
  const [resolution, setResolution] = useState<"1K" | "2K" | "4K">("2K");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (open) {
      setAspectRatio(projectAspectRatio);
    }
  }, [open, projectAspectRatio]);

  const imageModels: KieModel[] = [
    "flux-pro",
    "nano-banana-pro",
    "recraft-v3",
    "flux-schnell",
  ];
  const videoModels: KieModel[] = ["kling-ai-video"];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      await generateContent(
        sceneId,
        layerType,
        prompt,
        model,
        generationType,
        aspectRatio,
        resolution,
      );
      onOpenChange(false);
      setPrompt("");
    } catch (error) {
      console.error("Generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerationTypeChange = (type: "image" | "video") => {
    setGenerationType(type);
    // Переключаем на соответствующую модель
    if (type === "video") {
      setModel("kling-ai-video");
    } else {
      setModel("flux-pro");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Генерация контента через Kie.ai
          </DialogTitle>
          <DialogDescription>
            Создайте изображение или видео с помощью AI для слоя {layerType}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Тип генерации */}
          <div className="space-y-3">
            <Label>Тип контента</Label>
            <RadioGroup
              value={generationType}
              onValueChange={handleGenerationTypeChange}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="image" id="type-image" />
                <Label htmlFor="type-image" className="cursor-pointer">
                  Изображение
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="video" id="type-video" />
                <Label htmlFor="type-video" className="cursor-pointer">
                  Видео
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Промпт */}
          <div className="space-y-3">
            <Label htmlFor="prompt">Промпт</Label>
            <Textarea
              id="prompt"
              placeholder="Опишите что вы хотите сгенерировать..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Будьте как можно более конкретны в описании
            </p>
          </div>

          {/* Модель */}
          <div className="space-y-3">
            <Label htmlFor="model">Модель</Label>
            <Select
              value={model}
              onValueChange={(value) => setModel(value as KieModel)}
            >
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {generationType === "image" ? (
                  <>
                    <SelectItem value="nano-banana-pro">
                      Nano Banana Pro (Быстро)
                    </SelectItem>
                    <SelectItem value="recraft-v3">
                      Recraft V3 (Стильно)
                    </SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="kling-ai-video">
                      Kling AI Video
                    </SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Aspect Ratio (только для изображений) */}
          {generationType === "image" && (
            <div className="space-y-3">
              <Label htmlFor="aspect-ratio">Соотношение сторон</Label>
              <Select
                value={aspectRatio}
                onValueChange={(value) => setAspectRatio(value as any)}
              >
                <SelectTrigger id="aspect-ratio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9:16">
                    9:16 (Вертикально — Reels/Shorts)
                  </SelectItem>
                  <SelectItem value="3:4">3:4 (Вертикально)</SelectItem>
                  <SelectItem value="2:3">2:3 (Вертикально)</SelectItem>
                  <SelectItem value="4:5">
                    4:5 (Вертикально — Instagram)
                  </SelectItem>
                  <SelectItem value="1:1">1:1 (Квадрат)</SelectItem>
                  <SelectItem value="16:9">
                    16:9 (Горизонтально — YouTube)
                  </SelectItem>
                  <SelectItem value="4:3">4:3 (Горизонтально)</SelectItem>
                  <SelectItem value="3:2">3:2 (Горизонтально)</SelectItem>
                  <SelectItem value="5:4">5:4 (Горизонтально)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Совпадает с форматом проекта: {projectAspectRatio}
              </p>
            </div>
          )}

          {/* Разрешение (только для изображений) */}
          {generationType === "image" && (
            <div className="space-y-3">
              <Label htmlFor="resolution">Разрешение</Label>
              <Select
                value={resolution}
                onValueChange={(value) =>
                  setResolution(value as "1K" | "2K" | "4K")
                }
              >
                <SelectTrigger id="resolution">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1K">1K (Быстро, экономно)</SelectItem>
                  <SelectItem value="2K">2K (Рекомендуемое)</SelectItem>
                  <SelectItem value="4K">4K (Максимальное качество)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Отмена
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Генерация...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Генерировать
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
