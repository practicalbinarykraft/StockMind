import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Factory,
  Play,
  RotateCcw,
  TrendingUp,
  DollarSign,
  Calendar,
  Brain,
  AlertCircle,
  Palette,
  Clock,
  FileText,
  Plus,
  X,
  Code,
  BookOpen,
  AlertTriangle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useConveyorSettings } from "../hooks/use-conveyor-settings";
import { useState } from "react";

export function ConveyorSettingsSection() {
  const {
    settings,
    settingsLoading,
    stats,
    statsLoading,
    updateMutation,
    toggleEnabled,
    resetLearningMutation,
    triggerMutation,
  } = useConveyorSettings();

  const [localSettings, setLocalSettings] = useState({
    minScoreThreshold: 70,
    dailyLimit: 10,
    maxAgeDays: 7,
    monthlyBudgetLimit: "10.00",
    // Phase 1: Style customization
    stylePreferences: {
      formality: 'conversational' as const,
      tone: 'engaging' as const,
      language: 'ru' as const,
    },
    customGuidelines: [] as string[],
    durationRange: { min: 30, max: 90 },
    // Phase 2: Custom prompts
    customPrompts: null as { writerPrompt?: string; architectPrompt?: string } | null,
    // Phase 3: Script examples
    scriptExamples: [] as string[],
  });

  const [newGuideline, setNewGuideline] = useState("");
  const [showPromptEditor, setShowPromptEditor] = useState(false);

  // Sync local state with fetched settings
  if (settings && localSettings.minScoreThreshold !== settings.minScoreThreshold) {
    setLocalSettings({
      minScoreThreshold: settings.minScoreThreshold,
      dailyLimit: settings.dailyLimit,
      maxAgeDays: settings.maxAgeDays,
      monthlyBudgetLimit: settings.monthlyBudgetLimit,
      stylePreferences: settings.stylePreferences || { formality: 'conversational', tone: 'engaging', language: 'ru' },
      customGuidelines: settings.customGuidelines || [],
      durationRange: settings.durationRange || { min: 30, max: 90 },
      customPrompts: settings.customPrompts || null,
      scriptExamples: ((settings as any).scriptExamples as string[] | undefined) || [],
    });
  }

  const addGuideline = () => {
    if (newGuideline.trim()) {
      setLocalSettings({
        ...localSettings,
        customGuidelines: [...localSettings.customGuidelines, newGuideline.trim()],
      });
      setNewGuideline("");
    }
  };

  const removeGuideline = (index: number) => {
    setLocalSettings({
      ...localSettings,
      customGuidelines: localSettings.customGuidelines.filter((_, i) => i !== index),
    });
  };

  // Script examples functions
  const MAX_EXAMPLES = 5;
  const MAX_CHARS = 3000;

  const addScriptExample = () => {
    if (localSettings.scriptExamples.length < MAX_EXAMPLES) {
      setLocalSettings({
        ...localSettings,
        scriptExamples: [...localSettings.scriptExamples, ""],
      });
    }
  };

  const updateScriptExample = (index: number, value: string) => {
    const updated = [...localSettings.scriptExamples];
    updated[index] = value;
    setLocalSettings({
      ...localSettings,
      scriptExamples: updated,
    });
  };

  const removeScriptExample = (index: number) => {
    setLocalSettings({
      ...localSettings,
      scriptExamples: localSettings.scriptExamples.filter((_, i) => i !== index),
    });
  };

  const handleSave = () => {
    updateMutation.mutate(localSettings);
  };

  if (settingsLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const dailyProgress = stats
    ? (stats.itemsProcessedToday / stats.dailyLimit) * 100
    : 0;

  const budgetProgress = stats
    ? (parseFloat(stats.currentMonthCost) /
        parseFloat(stats.monthlyBudgetLimit)) *
      100
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              Content Factory
            </CardTitle>
            <CardDescription className="mt-2">
              Автоматическая генерация сценариев из новостей и Instagram
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="conveyor-enabled" className="text-sm">
                {settings?.enabled ? "Включён" : "Выключен"}
              </Label>
              <Switch
                id="conveyor-enabled"
                checked={settings?.enabled || false}
                onCheckedChange={toggleEnabled}
                disabled={updateMutation.isPending}
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status & Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Daily Progress */}
          <div className="p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Сегодня</span>
            </div>
            <div className="text-2xl font-bold">
              {stats?.itemsProcessedToday || 0}/{stats?.dailyLimit || 10}
            </div>
            <Progress value={dailyProgress} className="mt-2 h-2" />
          </div>

          {/* Budget */}
          <div className="p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Бюджет (месяц)</span>
            </div>
            <div className="text-2xl font-bold">
              ${stats?.currentMonthCost || "0"}/
              <span className="text-muted-foreground">
                ${stats?.monthlyBudgetLimit || "10"}
              </span>
            </div>
            <Progress value={budgetProgress} className="mt-2 h-2" />
          </div>

          {/* Approval Rate */}
          <div className="p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Approval Rate</span>
            </div>
            <div className="text-2xl font-bold">
              {stats?.approvalRate
                ? `${(parseFloat(stats.approvalRate) * 100).toFixed(0)}%`
                : "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats?.totalApproved || 0} одобрено / {stats?.totalRejected || 0}{" "}
              отклонено
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            onClick={() => triggerMutation.mutate()}
            disabled={
              !settings?.enabled ||
              triggerMutation.isPending ||
              (stats?.itemsProcessedToday || 0) >= (stats?.dailyLimit || 10)
            }
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            Запустить сейчас
          </Button>
          <Button variant="outline" asChild>
            <a href="/auto-scripts">Сценарии на ревью</a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/conveyor">Дашборд</a>
          </Button>
        </div>

        <Separator />

        {/* Settings */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium">Настройки</h3>

          {/* Score Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Минимальный Score</Label>
              <span className="text-sm font-medium">
                {localSettings.minScoreThreshold}
              </span>
            </div>
            <Slider
              value={[localSettings.minScoreThreshold]}
              onValueChange={([value]) =>
                setLocalSettings({ ...localSettings, minScoreThreshold: value })
              }
              min={50}
              max={95}
              step={5}
            />
            <p className="text-xs text-muted-foreground">
              Контент с оценкой ниже этого порога будет отклонён
            </p>
          </div>

          {/* Daily Limit */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Лимит в день</Label>
              <span className="text-sm font-medium">
                {localSettings.dailyLimit}
              </span>
            </div>
            <Slider
              value={[localSettings.dailyLimit]}
              onValueChange={([value]) =>
                setLocalSettings({ ...localSettings, dailyLimit: value })
              }
              min={1}
              max={50}
              step={1}
            />
          </div>

          {/* Max Age */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Максимальный возраст контента (дней)</Label>
              <span className="text-sm font-medium">
                {localSettings.maxAgeDays}
              </span>
            </div>
            <Slider
              value={[localSettings.maxAgeDays]}
              onValueChange={([value]) =>
                setLocalSettings({ ...localSettings, maxAgeDays: value })
              }
              min={1}
              max={30}
              step={1}
            />
          </div>

          {/* Monthly Budget */}
          <div className="space-y-2">
            <Label htmlFor="budget">Месячный бюджет ($)</Label>
            <Input
              id="budget"
              type="number"
              step="0.50"
              min="1"
              max="100"
              value={localSettings.monthlyBudgetLimit}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  monthlyBudgetLimit: e.target.value,
                })
              }
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              ~$0.08 за один сценарий
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            Сохранить настройки
          </Button>
        </div>

        <Separator />

        {/* Phase 1: Style & Voice Customization */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <h3 className="text-lg font-medium">Стиль и голос</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Formality */}
            <div className="space-y-2">
              <Label>Формальность</Label>
              <Select
                value={localSettings.stylePreferences.formality}
                onValueChange={(value: 'formal' | 'conversational' | 'casual') =>
                  setLocalSettings({
                    ...localSettings,
                    stylePreferences: { ...localSettings.stylePreferences, formality: value },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Формальный</SelectItem>
                  <SelectItem value="conversational">Разговорный</SelectItem>
                  <SelectItem value="casual">Неформальный</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tone */}
            <div className="space-y-2">
              <Label>Тон</Label>
              <Select
                value={localSettings.stylePreferences.tone}
                onValueChange={(value: 'serious' | 'engaging' | 'funny' | 'motivational') =>
                  setLocalSettings({
                    ...localSettings,
                    stylePreferences: { ...localSettings.stylePreferences, tone: value },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="serious">Серьёзный</SelectItem>
                  <SelectItem value="engaging">Вовлекающий</SelectItem>
                  <SelectItem value="funny">С юмором</SelectItem>
                  <SelectItem value="motivational">Мотивирующий</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Language */}
            <div className="space-y-2">
              <Label>Язык сценария</Label>
              <Select
                value={localSettings.stylePreferences.language}
                onValueChange={(value: 'ru' | 'en') =>
                  setLocalSettings({
                    ...localSettings,
                    stylePreferences: { ...localSettings.stylePreferences, language: value },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ru">Русский</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration Range */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label>Длительность видео (сек)</Label>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Мин: {localSettings.durationRange.min}с</span>
                  <span>Макс: {localSettings.durationRange.max}с</span>
                </div>
                <Slider
                  value={[localSettings.durationRange.min, localSettings.durationRange.max]}
                  onValueChange={([min, max]) =>
                    setLocalSettings({
                      ...localSettings,
                      durationRange: { min, max },
                    })
                  }
                  min={15}
                  max={180}
                  step={5}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Оптимально: {Math.round((localSettings.durationRange.min + localSettings.durationRange.max) / 2)} секунд
            </p>
          </div>

          {/* Custom Guidelines */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Label>Ваши правила для агентов</Label>
            </div>
            <div className="flex gap-2">
              <Input
                value={newGuideline}
                onChange={(e) => setNewGuideline(e.target.value)}
                placeholder="Добавьте правило (например: 'Не использовать слово хайп')"
                onKeyDown={(e) => e.key === 'Enter' && addGuideline()}
              />
              <Button variant="outline" size="icon" onClick={addGuideline}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {localSettings.customGuidelines.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {localSettings.customGuidelines.map((guideline, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 pr-1">
                    {guideline}
                    <button
                      onClick={() => removeGuideline(i)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Эти правила будут использоваться при генерации каждого сценария
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            Сохранить стиль
          </Button>
        </div>

        <Separator />

        {/* Phase 2: Custom Prompts (Advanced) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              <h3 className="text-lg font-medium">Кастомные промпты</h3>
              <Badge variant="outline">Advanced</Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPromptEditor(!showPromptEditor)}
            >
              {showPromptEditor ? "Скрыть" : "Показать"}
            </Button>
          </div>

          {showPromptEditor && (
            <Tabs defaultValue="writer" className="w-full">
              <TabsList>
                <TabsTrigger value="writer">Writer Agent</TabsTrigger>
                <TabsTrigger value="architect">Architect Agent</TabsTrigger>
              </TabsList>
              <TabsContent value="writer" className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Кастомный промпт для агента-сценариста. Оставьте пустым для использования по умолчанию.
                </p>
                <Textarea
                  value={localSettings.customPrompts?.writerPrompt || ""}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      customPrompts: { ...localSettings.customPrompts, writerPrompt: e.target.value || undefined },
                    })
                  }
                  placeholder="Используйте переменные: {{FORMAT}}, {{KEY_FACTS}}, {{UNIQUE_ANGLE}}, {{SOURCE_CONTENT}}, {{TARGET_AUDIENCE}}, {{EMOTIONAL_ANGLES}}"
                  rows={10}
                  className="font-mono text-sm"
                />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Доступные переменные:</strong></p>
                  <p>{"{{FORMAT}}, {{SUGGESTED_HOOK}}, {{KEY_FACTS}}, {{UNIQUE_ANGLE}}, {{EMOTIONAL_ANGLES}}, {{TARGET_AUDIENCE}}, {{SOURCE_TITLE}}, {{SOURCE_CONTENT}}"}</p>
                </div>
              </TabsContent>
              <TabsContent value="architect" className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Кастомный промпт для агента-архитектора. Оставьте пустым для использования по умолчанию.
                </p>
                <Textarea
                  value={localSettings.customPrompts?.architectPrompt || ""}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      customPrompts: { ...localSettings.customPrompts, architectPrompt: e.target.value || undefined },
                    })
                  }
                  placeholder="Используйте переменные: {{MAIN_TOPIC}}, {{SUB_TOPICS}}, {{TARGET_AUDIENCE}}, {{MIN_DURATION}}, {{MAX_DURATION}}, {{FORMATS_LIST}}"
                  rows={10}
                  className="font-mono text-sm"
                />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Доступные переменные:</strong></p>
                  <p>{"{{MAIN_TOPIC}}, {{SUB_TOPICS}}, {{TARGET_AUDIENCE}}, {{EMOTIONAL_ANGLES}}, {{CONTROVERSY_LEVEL}}, {{UNIQUE_ANGLE}}, {{SCORE}}, {{MIN_DURATION}}, {{MAX_DURATION}}, {{FORMATS_LIST}}"}</p>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {showPromptEditor && (
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              Сохранить промпты
            </Button>
          )}
        </div>

        <Separator />

        {/* Phase 3: Script Examples */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <h3 className="text-lg font-medium">Образцы сценариев</h3>
              <Badge variant="secondary">{localSettings.scriptExamples.length}/{MAX_EXAMPLES}</Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addScriptExample}
              disabled={localSettings.scriptExamples.length >= MAX_EXAMPLES}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Добавить образец
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Добавьте примеры сценариев, которые вам нравятся. Writer Agent будет использовать их как стилевой ориентир при генерации новых сценариев.
            Текст должен быть чистым для озвучки - без комментариев и эмодзи.
          </p>

          {localSettings.scriptExamples.length === 0 ? (
            <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Пока нет образцов сценариев</p>
              <p className="text-xs mt-1">Нажмите "Добавить образец" чтобы добавить пример</p>
            </div>
          ) : (
            <div className="space-y-4">
              {localSettings.scriptExamples.map((example, index) => {
                const charCount = example.length;
                const isOverLimit = charCount > MAX_CHARS;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Образец {index + 1}</Label>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                          {charCount}/{MAX_CHARS}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeScriptExample(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      value={example}
                      onChange={(e) => updateScriptExample(index, e.target.value)}
                      placeholder="Вставьте текст сценария, который вам нравится..."
                      rows={6}
                      className={isOverLimit ? 'border-destructive' : ''}
                    />
                    {isOverLimit && (
                      <div className="flex items-center gap-1 text-destructive text-xs">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Превышен лимит символов. Текст будет обрезан при сохранении.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {localSettings.scriptExamples.length > 0 && (
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              Сохранить образцы
            </Button>
          )}
        </div>

        <Separator />

        {/* Learning System Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            <h3 className="text-lg font-medium">Система обучения</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg border">
              <div className="text-sm text-muted-foreground">
                Адаптивный порог
              </div>
              <div className="text-lg font-medium">
                {stats?.learnedThreshold || "Не обучен"}
              </div>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-sm text-muted-foreground">
                Избегаемые темы
              </div>
              <div className="text-lg font-medium">
                {stats?.avoidedTopics?.length || 0}
              </div>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-sm text-muted-foreground">
                Предпочитаемые форматы
              </div>
              <div className="text-lg font-medium">
                {stats?.preferredFormats?.length || 0}
              </div>
            </div>
          </div>

          {stats?.avoidedTopics && stats.avoidedTopics.length > 0 && (
            <div className="space-y-2">
              <Label>Избегаемые темы:</Label>
              <div className="flex flex-wrap gap-2">
                {stats.avoidedTopics.slice(0, 10).map((topic, i) => (
                  <Badge key={i} variant="secondary">
                    {topic}
                  </Badge>
                ))}
                {stats.avoidedTopics.length > 10 && (
                  <Badge variant="outline">
                    +{stats.avoidedTopics.length - 10}
                  </Badge>
                )}
              </div>
            </div>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="gap-2"
                disabled={resetLearningMutation.isPending}
              >
                <RotateCcw className="h-4 w-4" />
                Сбросить обучение
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Сбросить данные обучения?</AlertDialogTitle>
                <AlertDialogDescription>
                  Это действие удалит все накопленные паттерны, избегаемые темы
                  и предпочитаемые форматы. Система начнёт обучение заново.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => resetLearningMutation.mutate()}
                >
                  Сбросить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Separator />

        {/* Stats Summary */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Статистика</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">
                {stats?.totalProcessed || 0}
              </div>
              <div className="text-xs text-muted-foreground">Обработано</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {stats?.totalPassed || 0}
              </div>
              <div className="text-xs text-muted-foreground">Прошли</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {stats?.totalFailed || 0}
              </div>
              <div className="text-xs text-muted-foreground">Отклонены</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {stats?.totalApproved || 0}
              </div>
              <div className="text-xs text-muted-foreground">Одобрено</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {stats?.totalRejected || 0}
              </div>
              <div className="text-xs text-muted-foreground">
                Отклонено вами
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
