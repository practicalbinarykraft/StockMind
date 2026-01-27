import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { Separator } from "@/shared/ui/separator";
import { Skeleton } from "@/shared/ui/skeleton";
import { Factory } from "lucide-react";
import { useConveyorSettings } from "../hooks/use-conveyor-settings";
import { useState, useEffect } from "react";

import {
  ConveyorQuickStats,
  ConveyorBasicSettings,
  ConveyorStyleSettings,
  ConveyorCustomPrompts,
  ConveyorScriptExamples,
  ConveyorLearningSystem,
  ConveyorStatsSummary,
  type StylePreferences,
  type DurationRange,
  type CustomPrompts,
} from "./ConveyorSettingsSection/";

interface LocalSettings {
  minScoreThreshold: number;
  dailyLimit: number;
  maxAgeDays: number;
  monthlyBudgetLimit: string;
  stylePreferences: StylePreferences;
  customGuidelines: string[];
  durationRange: DurationRange;
  customPrompts: CustomPrompts | null;
  scriptExamples: string[];
}

const DEFAULT_SETTINGS: LocalSettings = {
  minScoreThreshold: 70,
  dailyLimit: 10,
  maxAgeDays: 7,
  monthlyBudgetLimit: "10.00",
  stylePreferences: {
    formality: "conversational",
    tone: "engaging",
    language: "ru",
  },
  customGuidelines: [],
  durationRange: { min: 30, max: 90 },
  customPrompts: null,
  scriptExamples: [],
};

/**
 * Main conveyor settings section
 * Composes smaller sub-components for maintainability
 */
export function ConveyorSettingsSection() {
  const {
    settings,
    settingsLoading,
    stats,
    updateMutation,
    toggleEnabled,
    resetLearningMutation,
    triggerMutation,
  } = useConveyorSettings();

  const [localSettings, setLocalSettings] = useState<LocalSettings>(DEFAULT_SETTINGS);

  // Sync local state with fetched settings
  useEffect(() => {
    if (settings) {
      setLocalSettings({
        minScoreThreshold: settings.minScoreThreshold,
        dailyLimit: settings.dailyLimit,
        maxAgeDays: settings.maxAgeDays,
        monthlyBudgetLimit: settings.monthlyBudgetLimit,
        stylePreferences: (settings.stylePreferences || DEFAULT_SETTINGS.stylePreferences) as StylePreferences,
        customGuidelines: settings.customGuidelines || [],
        durationRange: settings.durationRange || DEFAULT_SETTINGS.durationRange,
        customPrompts: settings.customPrompts || null,
        scriptExamples: ((settings as any).scriptExamples as string[] | undefined) || [],
      });
    }
  }, [settings]);

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
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              Content Factory Settings
            </CardTitle>
            <CardDescription className="mt-2">
              Автоматическое создание сценариев из новостей и Instagram Reels
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="conveyor-enabled">Enabled</Label>
              <Switch
                id="conveyor-enabled"
                checked={settings?.enabled || false}
                onCheckedChange={toggleEnabled}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Stats + Manual Trigger */}
        <ConveyorQuickStats
          stats={stats || null}
          enabled={settings?.enabled || false}
          onTrigger={() => triggerMutation.mutate()}
          isTriggerPending={triggerMutation.isPending}
        />

        <Separator />

        {/* Basic Settings */}
        <ConveyorBasicSettings
          settings={{
            minScoreThreshold: localSettings.minScoreThreshold,
            dailyLimit: localSettings.dailyLimit,
            maxAgeDays: localSettings.maxAgeDays,
            monthlyBudgetLimit: localSettings.monthlyBudgetLimit,
          }}
          onSettingsChange={(newSettings: Partial<LocalSettings>) =>
            setLocalSettings({ ...localSettings, ...newSettings })
          }
          onSave={handleSave}
          isSaving={updateMutation.isPending}
        />

        <Separator />

        {/* Style Settings */}
        <ConveyorStyleSettings
          stylePreferences={localSettings.stylePreferences}
          durationRange={localSettings.durationRange}
          customGuidelines={localSettings.customGuidelines}
          onStyleChange={(style: StylePreferences) =>
            setLocalSettings({ ...localSettings, stylePreferences: style })
          }
          onDurationChange={(duration: DurationRange) =>
            setLocalSettings({ ...localSettings, durationRange: duration })
          }
          onGuidelinesChange={(guidelines: string[]) =>
            setLocalSettings({ ...localSettings, customGuidelines: guidelines })
          }
          onSave={handleSave}
          isSaving={updateMutation.isPending}
        />
      </CardContent>
    </Card>
  );
}
