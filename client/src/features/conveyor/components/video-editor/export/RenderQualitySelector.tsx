import React from "react";
import { Card, CardContent } from "@/shared/ui/card";
import { Sparkles, Scale, Package } from "lucide-react";
import { cn } from "@/shared/utils";

export type RenderQuality = "high" | "medium" | "low";

interface QualityOption {
  id: RenderQuality;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  crf: number;
}

const qualityOptions: QualityOption[] = [
  {
    id: "high",
    label: "High",
    description: "Максимальное качество",
    icon: Sparkles,
    crf: 18,
  },
  {
    id: "medium",
    label: "Medium",
    description: "Оптимальный баланс (рекомендуется)",
    icon: Scale,
    crf: 23,
  },
  {
    id: "low",
    label: "Low",
    description: "Компактный размер",
    icon: Package,
    crf: 28,
  },
];

interface RenderQualitySelectorProps {
  selectedQuality: RenderQuality;
  onQualityChange: (quality: RenderQuality) => void;
  disabled?: boolean;
}

export function RenderQualitySelector({
  selectedQuality,
  onQualityChange,
  disabled = false,
}: RenderQualitySelectorProps) {
  return (
    <Card className="border-muted">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-1">Качество видео</h3>
            <p className="text-xs text-muted-foreground">
              Выберите баланс между качеством и размером файла
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {qualityOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedQuality === option.id;
              const isRecommended = option.id === "medium";

              return (
                <button
                  key={option.id}
                  onClick={() => !disabled && onQualityChange(option.id)}
                  disabled={disabled}
                  className={cn(
                    "relative flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left",
                    "hover:border-primary/50 hover:bg-accent/50",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background",
                  )}
                >
                  {/* Иконка */}
                  <div
                    className={cn(
                      "flex-shrink-0 p-2 rounded-md transition-colors",
                      isSelected
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Контент */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium">
                        {option.label}
                      </span>
                      {isRecommended && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                          Рекомендуется
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      CRF: {option.crf}
                    </p>
                  </div>

                  {/* Индикатор выбора */}
                  {isSelected && (
                    <div className="flex-shrink-0">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-primary-foreground"
                          fill="none"
                          strokeWidth="2.5"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Дополнительная информация */}
          <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
            <p>
              💡 <strong>High:</strong> ~2-3 GB для 5-минутного видео
            </p>
            <p>
              💡 <strong>Medium:</strong> ~1-1.5 GB для 5-минутного видео
            </p>
            <p>
              💡 <strong>Low:</strong> ~500-800 MB для 5-минутного видео
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
