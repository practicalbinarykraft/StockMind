import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Slider } from "@/shared/ui/slider";
import { Badge } from "@/shared/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Palette, Clock, FileText, Plus, X } from "lucide-react";
import { useState } from "react";

export interface StylePreferences {
  formality: "formal" | "conversational" | "casual";
  tone: "serious" | "engaging" | "funny" | "motivational";
  language: "ru" | "en";
}

export interface DurationRange {
  min: number;
  max: number;
}

interface ConveyorStyleSettingsProps {
  stylePreferences: StylePreferences;
  durationRange: DurationRange;
  customGuidelines: string[];
  onStyleChange: (prefs: StylePreferences) => void;
  onDurationChange: (range: DurationRange) => void;
  onGuidelinesChange: (guidelines: string[]) => void;
  onSave: () => void;
  isSaving: boolean;
}

/**
 * Style & Voice customization: formality, tone, language, duration, guidelines
 */
export function ConveyorStyleSettings({
  stylePreferences,
  durationRange,
  customGuidelines,
  onStyleChange,
  onDurationChange,
  onGuidelinesChange,
  onSave,
  isSaving,
}: ConveyorStyleSettingsProps) {
  const [newGuideline, setNewGuideline] = useState("");

  const addGuideline = () => {
    if (newGuideline.trim()) {
      onGuidelinesChange([...customGuidelines, newGuideline.trim()]);
      setNewGuideline("");
    }
  };

  const removeGuideline = (index: number) => {
    onGuidelinesChange(customGuidelines.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Palette className="h-5 w-5" />
        <h3 className="text-lg font-medium">Стиль и голос</h3>
      </div>

      {/* Style Selects */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Formality */}
        <div className="space-y-2">
          <Label>Формальность</Label>
          <Select
            value={stylePreferences.formality}
            onValueChange={(value: StylePreferences["formality"]) =>
              onStyleChange({ ...stylePreferences, formality: value })
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
            value={stylePreferences.tone}
            onValueChange={(value: StylePreferences["tone"]) =>
              onStyleChange({ ...stylePreferences, tone: value })
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
            value={stylePreferences.language}
            onValueChange={(value: StylePreferences["language"]) =>
              onStyleChange({ ...stylePreferences, language: value })
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
              <span>Мин: {durationRange.min}с</span>
              <span>Макс: {durationRange.max}с</span>
            </div>
            <Slider
              value={[durationRange.min, durationRange.max]}
              onValueChange={([min, max]) => onDurationChange({ min, max })}
              min={15}
              max={180}
              step={5}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Оптимально: {Math.round((durationRange.min + durationRange.max) / 2)} секунд
        </p>
      </div>

      <Button onClick={onSave} disabled={isSaving}>
        Сохранить стиль
      </Button>
    </div>
  );
}
