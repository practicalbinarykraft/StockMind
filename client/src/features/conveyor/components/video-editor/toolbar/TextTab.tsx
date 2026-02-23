/**
 * Вкладка для настройки текстового слоя
 * Поддерживает загрузку текста сценария, стилизацию и эффекты
 */

import {
  useCompositionStore,
  selectCurrentScene,
} from "../../../stores/composition";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Slider } from "@/shared/ui/slider";
import { Switch } from "@/shared/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Separator } from "@/shared/ui/separator";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { FileText, Wand2 } from "lucide-react";
import type { TextPosition, TextAnimation } from "../../../types/layers";

const ANIMATION_OPTIONS: {
  value: TextAnimation;
  label: string;
  description: string;
}[] = [
  {
    value: "none",
    label: "Без анимации",
    description: "Текст появляется сразу",
  },
  {
    value: "fadeIn",
    label: "Плавное появление",
    description: "Постепенное проявление",
  },
  {
    value: "typewriter",
    label: "Печатная машинка",
    description: "Посимвольный набор",
  },
  {
    value: "slideUp",
    label: "Выезд снизу",
    description: "Текст поднимается снизу",
  },
  {
    value: "slideDown",
    label: "Выезд сверху",
    description: "Текст опускается сверху",
  },
  {
    value: "scaleIn",
    label: "Масштабирование",
    description: "Увеличение из центра",
  },
];

const TEXT_SHADOW_PRESETS = [
  { value: "", label: "Без тени" },
  { value: "2px 2px 4px rgba(0,0,0,0.5)", label: "Лёгкая тень" },
  { value: "3px 3px 6px rgba(0,0,0,0.8)", label: "Средняя тень" },
  { value: "0px 0px 10px rgba(0,0,0,0.9)", label: "Свечение (тёмное)" },
  { value: "0px 0px 10px rgba(255,255,255,0.9)", label: "Свечение (светлое)" },
  { value: "4px 4px 0px rgba(0,0,0,1)", label: "Жёсткая тень" },
];

export function TextTab() {
  const currentScene = useCompositionStore(selectCurrentScene);
  const updateTextLayer = useCompositionStore((state) => state.updateTextLayer);

  if (!currentScene) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Выберите сцену для настройки текста
      </div>
    );
  }

  const textLayer = currentScene.layers?.textLayer;
  const sceneText = currentScene.text;

  if (!textLayer) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Текстовый слой не инициализирован для этой сцены
      </div>
    );
  }

  const handleToggleVisible = (checked: boolean) => {
    updateTextLayer(currentScene.id, { isVisible: checked });
  };

  const handleTextChange = (text: string) => {
    updateTextLayer(currentScene.id, { text });
  };

  const handleLoadScriptText = () => {
    if (sceneText) {
      updateTextLayer(currentScene.id, { text: sceneText, isVisible: true });
    }
  };

  const handleModeChange = (mode: "static" | "marquee") => {
    updateTextLayer(currentScene.id, { mode });
  };

  const handlePositionTypeChange = (type: TextPosition["type"]) => {
    updateTextLayer(currentScene.id, { position: { type } });
  };

  const handleFontSizeChange = (value: number[]) => {
    updateTextLayer(currentScene.id, { fontSize: value[0] });
  };

  const handleFontFamilyChange = (fontFamily: string) => {
    updateTextLayer(currentScene.id, { fontFamily });
  };

  const handleTextColorChange = (textColor: string) => {
    updateTextLayer(currentScene.id, { textColor });
  };

  const handleTextAlignChange = (textAlign: "left" | "center" | "right") => {
    updateTextLayer(currentScene.id, { textAlign });
  };

  const handleBackgroundColorChange = (backgroundColor: string) => {
    updateTextLayer(currentScene.id, { backgroundColor });
  };

  const handleBackgroundOpacityChange = (value: number[]) => {
    updateTextLayer(currentScene.id, { backgroundOpacity: value[0] / 100 });
  };

  const handleMarqueeSpeedChange = (value: number[]) => {
    updateTextLayer(currentScene.id, { marqueeSpeed: value[0] });
  };

  const handleAnimationChange = (animation: TextAnimation) => {
    updateTextLayer(currentScene.id, { animation });
  };

  const handleTextShadowChange = (textShadow: string) => {
    updateTextLayer(currentScene.id, { textShadow });
  };

  const handleTextStrokeChange = (textStroke: string) => {
    updateTextLayer(currentScene.id, { textStroke });
  };

  const handleTextStrokeColorChange = (textStrokeColor: string) => {
    updateTextLayer(currentScene.id, { textStrokeColor });
  };

  const handleLetterSpacingChange = (value: number[]) => {
    updateTextLayer(currentScene.id, { letterSpacing: value[0] });
  };

  const handleLineHeightChange = (value: number[]) => {
    updateTextLayer(currentScene.id, { lineHeight: value[0] / 10 });
  };

  return (
    <div className="space-y-6">
      {/* Текст сценария для текущей сцены */}
      {sceneText && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Текст сценария</h3>
            </div>
            <Badge variant="secondary" className="text-xs">
              Сцена {currentScene.order}
            </Badge>
          </div>
          <div className="rounded-md border bg-muted/50 p-3">
            <p className="text-sm text-foreground leading-relaxed">
              {sceneText}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleLoadScriptText}
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Загрузить в текстовый слой
          </Button>
          <Separator />
        </div>
      )}

      {/* Включить/выключить текстовый слой */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Текстовый слой</h3>
          <p className="text-sm text-muted-foreground">
            Добавить текст поверх видео
          </p>
        </div>
        <Switch
          checked={textLayer?.isVisible || false}
          onCheckedChange={handleToggleVisible}
        />
      </div>

      {textLayer?.isVisible && (
        <>
          <Separator />

          {/* Текст */}
          <div className="space-y-3">
            <Label htmlFor="text-content">Текст</Label>
            <Textarea
              id="text-content"
              placeholder="Введите текст..."
              value={textLayer.text || ""}
              onChange={(e) => handleTextChange(e.target.value)}
              rows={3}
            />
          </div>

          {/* Режим */}
          <div className="space-y-3">
            <Label>Режим отображения</Label>
            <RadioGroup value={textLayer.mode} onValueChange={handleModeChange}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="static" id="mode-static" />
                <Label htmlFor="mode-static" className="cursor-pointer">
                  Статичный
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="marquee" id="mode-marquee" />
                <Label htmlFor="mode-marquee" className="cursor-pointer">
                  Бегущая строка
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Позиция */}
          <div className="space-y-3">
            <Label>Позиция</Label>
            <RadioGroup
              value={textLayer.position.type}
              onValueChange={handlePositionTypeChange}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="top" id="pos-top" />
                <Label htmlFor="pos-top" className="cursor-pointer">
                  Сверху
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="center" id="pos-center" />
                <Label htmlFor="pos-center" className="cursor-pointer">
                  По центру
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bottom" id="pos-bottom" />
                <Label htmlFor="pos-bottom" className="cursor-pointer">
                  Снизу
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Анимация текста */}
          <div className="space-y-3">
            <h4 className="font-semibold">Анимация</h4>
            <Select
              value={textLayer.animation || "none"}
              onValueChange={(v) => handleAnimationChange(v as TextAnimation)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите анимацию" />
              </SelectTrigger>
              <SelectContent>
                {ANIMATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex flex-col">
                      <span>{opt.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {opt.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Стиль текста */}
          <div className="space-y-4">
            <h4 className="font-semibold">Стиль текста</h4>

            {/* Размер шрифта */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Размер шрифта</Label>
                <span className="text-sm text-muted-foreground">
                  {textLayer.fontSize}px
                </span>
              </div>
              <Slider
                value={[textLayer.fontSize]}
                min={12}
                max={120}
                step={2}
                onValueChange={handleFontSizeChange}
              />
            </div>

            {/* Семейство шрифта */}
            <div className="space-y-3">
              <Label htmlFor="font-family">Шрифт</Label>
              <Select
                value={textLayer.fontFamily}
                onValueChange={handleFontFamilyChange}
              >
                <SelectTrigger id="font-family">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Arial">Arial</SelectItem>
                  <SelectItem value="Helvetica">Helvetica</SelectItem>
                  <SelectItem value="Times New Roman">
                    Times New Roman
                  </SelectItem>
                  <SelectItem value="Georgia">Georgia</SelectItem>
                  <SelectItem value="Verdana">Verdana</SelectItem>
                  <SelectItem value="Courier New">Courier New</SelectItem>
                  <SelectItem value="Impact">Impact</SelectItem>
                  <SelectItem value="Roboto">Roboto</SelectItem>
                  <SelectItem value="Open Sans">Open Sans</SelectItem>
                  <SelectItem value="Montserrat">Montserrat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Межбуквенный интервал */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Межбуквенный интервал</Label>
                <span className="text-sm text-muted-foreground">
                  {textLayer.letterSpacing ?? 0}px
                </span>
              </div>
              <Slider
                value={[textLayer.letterSpacing ?? 0]}
                min={-5}
                max={20}
                step={1}
                onValueChange={handleLetterSpacingChange}
              />
            </div>

            {/* Межстрочный интервал */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Межстрочный интервал</Label>
                <span className="text-sm text-muted-foreground">
                  {(textLayer.lineHeight ?? 1.4).toFixed(1)}
                </span>
              </div>
              <Slider
                value={[Math.round((textLayer.lineHeight ?? 1.4) * 10)]}
                min={8}
                max={30}
                step={1}
                onValueChange={handleLineHeightChange}
              />
            </div>

            {/* Цвет текста */}
            <div className="space-y-3">
              <Label htmlFor="text-color">Цвет текста</Label>
              <div className="flex gap-2">
                <Input
                  id="text-color"
                  type="color"
                  value={textLayer.textColor}
                  onChange={(e) => handleTextColorChange(e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={textLayer.textColor}
                  onChange={(e) => handleTextColorChange(e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Выравнивание */}
            <div className="space-y-3">
              <Label>Выравнивание</Label>
              <RadioGroup
                value={textLayer.textAlign}
                onValueChange={handleTextAlignChange}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="left" id="align-left" />
                  <Label htmlFor="align-left" className="cursor-pointer">
                    По левому краю
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="center" id="align-center" />
                  <Label htmlFor="align-center" className="cursor-pointer">
                    По центру
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="right" id="align-right" />
                  <Label htmlFor="align-right" className="cursor-pointer">
                    По правому краю
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <Separator />

          {/* Эффекты текста */}
          <div className="space-y-4">
            <h4 className="font-semibold">Эффекты</h4>

            {/* Тень текста */}
            <div className="space-y-3">
              <Label>Тень текста</Label>
              <Select
                value={textLayer.textShadow || ""}
                onValueChange={handleTextShadowChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Без тени" />
                </SelectTrigger>
                <SelectContent>
                  {TEXT_SHADOW_PRESETS.map((preset) => (
                    <SelectItem
                      key={preset.value || "none"}
                      value={preset.value || "none"}
                    >
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Обводка текста */}
            <div className="space-y-3">
              <Label>Обводка текста</Label>
              <Select
                value={textLayer.textStroke || ""}
                onValueChange={handleTextStrokeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Без обводки" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без обводки</SelectItem>
                  <SelectItem value="1px">Тонкая (1px)</SelectItem>
                  <SelectItem value="2px">Средняя (2px)</SelectItem>
                  <SelectItem value="3px">Толстая (3px)</SelectItem>
                </SelectContent>
              </Select>

              {textLayer.textStroke && textLayer.textStroke !== "none" && (
                <div className="flex gap-2">
                  <Label className="flex-shrink-0 self-center">Цвет</Label>
                  <Input
                    type="color"
                    value={textLayer.textStrokeColor || "#000000"}
                    onChange={(e) =>
                      handleTextStrokeColorChange(e.target.value)
                    }
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={textLayer.textStrokeColor || "#000000"}
                    onChange={(e) =>
                      handleTextStrokeColorChange(e.target.value)
                    }
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Фон текста */}
          <div className="space-y-4">
            <h4 className="font-semibold">Фон текста</h4>

            <div className="space-y-3">
              <Label htmlFor="bg-color">Цвет фона (опционально)</Label>
              <div className="flex gap-2">
                <Input
                  id="bg-color"
                  type="color"
                  value={textLayer.backgroundColor || "#000000"}
                  onChange={(e) => handleBackgroundColorChange(e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={textLayer.backgroundColor || ""}
                  onChange={(e) => handleBackgroundColorChange(e.target.value)}
                  placeholder="Не задан"
                  className="flex-1"
                />
              </div>
            </div>

            {textLayer.backgroundColor && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Прозрачность фона</Label>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(textLayer.backgroundOpacity * 100)}%
                  </span>
                </div>
                <Slider
                  value={[textLayer.backgroundOpacity * 100]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={handleBackgroundOpacityChange}
                />
              </div>
            )}
          </div>

          {/* Скорость бегущей строки */}
          {textLayer.mode === "marquee" && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Скорость бегущей строки</Label>
                  <span className="text-sm text-muted-foreground">
                    {textLayer.marqueeSpeed}px/s
                  </span>
                </div>
                <Slider
                  value={[textLayer.marqueeSpeed]}
                  min={10}
                  max={200}
                  step={10}
                  onValueChange={handleMarqueeSpeedChange}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
