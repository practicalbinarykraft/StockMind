import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Slider } from "@/shared/ui/slider";

interface BasicSettings {
  minScoreThreshold: number;
  dailyLimit: number;
  maxAgeDays: number;
  monthlyBudgetLimit: string;
}

interface ConveyorBasicSettingsProps {
  settings: BasicSettings;
  onSettingsChange: (settings: BasicSettings) => void;
  onSave: () => void;
  isSaving: boolean;
}

/**
 * Basic conveyor settings: score threshold, daily limit, max age, budget
 */
export function ConveyorBasicSettings({
  settings,
  onSettingsChange,
  onSave,
  isSaving,
}: ConveyorBasicSettingsProps) {
  const updateSetting = <K extends keyof BasicSettings>(
    key: K,
    value: BasicSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Настройки</h3>

      {/* Score Threshold */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Минимальный Score</Label>
          <span className="text-sm font-medium">{settings.minScoreThreshold}</span>
        </div>
        <Slider
          value={[settings.minScoreThreshold]}
          onValueChange={([value]) => updateSetting("minScoreThreshold", value)}
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
          <span className="text-sm font-medium">{settings.dailyLimit}</span>
        </div>
        <Slider
          value={[settings.dailyLimit]}
          onValueChange={([value]) => updateSetting("dailyLimit", value)}
          min={1}
          max={50}
          step={1}
        />
      </div>

      {/* Max Age */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Максимальный возраст контента (дней)</Label>
          <span className="text-sm font-medium">{settings.maxAgeDays}</span>
        </div>
        <Slider
          value={[settings.maxAgeDays]}
          onValueChange={([value]) => updateSetting("maxAgeDays", value)}
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
          value={settings.monthlyBudgetLimit}
          onChange={(e) => updateSetting("monthlyBudgetLimit", e.target.value)}
          className="w-32"
        />
        <p className="text-xs text-muted-foreground">~$0.08 за один сценарий</p>
      </div>

      <Button onClick={onSave} disabled={isSaving}>
        Сохранить настройки
      </Button>
    </div>
  );
}
