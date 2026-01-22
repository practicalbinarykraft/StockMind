import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { Textarea } from "@/shared/ui/textarea";
import { BookOpen, Plus, X, AlertTriangle } from "lucide-react";

const MAX_EXAMPLES = 5;
const MAX_CHARS = 3000;

interface ConveyorScriptExamplesProps {
  examples: string[];
  onExamplesChange: (examples: string[]) => void;
  onSave: () => void;
  isSaving: boolean;
}

/**
 * Script examples manager for Writer Agent style learning
 */
export function ConveyorScriptExamples({
  examples,
  onExamplesChange,
  onSave,
  isSaving,
}: ConveyorScriptExamplesProps) {
  const addExample = () => {
    if (examples.length < MAX_EXAMPLES) {
      onExamplesChange([...examples, ""]);
    }
  };

  const updateExample = (index: number, value: string) => {
    const updated = [...examples];
    updated[index] = value;
    onExamplesChange(updated);
  };

  const removeExample = (index: number) => {
    onExamplesChange(examples.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          <h3 className="text-lg font-medium">Образцы сценариев</h3>
          <Badge variant="secondary">
            {examples.length}/{MAX_EXAMPLES}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={addExample}
          disabled={examples.length >= MAX_EXAMPLES}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Добавить образец
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Добавьте примеры сценариев, которые вам нравятся. Writer Agent будет
        использовать их как стилевой ориентир при генерации новых сценариев.
        Текст должен быть чистым для озвучки - без комментариев и эмодзи.
      </p>

      {examples.length === 0 ? (
        <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Пока нет образцов сценариев</p>
          <p className="text-xs mt-1">
            Нажмите "Добавить образец" чтобы добавить пример
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {examples.map((example, index) => {
            const charCount = example.length;
            const isOverLimit = charCount > MAX_CHARS;
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Образец {index + 1}
                  </Label>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs ${
                        isOverLimit
                          ? "text-destructive font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {charCount}/{MAX_CHARS}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeExample(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={example}
                  onChange={(e) => updateExample(index, e.target.value)}
                  placeholder="Вставьте текст сценария, который вам нравится..."
                  rows={6}
                  className={isOverLimit ? "border-destructive" : ""}
                />
                {isOverLimit && (
                  <div className="flex items-center gap-1 text-destructive text-xs">
                    <AlertTriangle className="h-3 w-3" />
                    <span>
                      Превышен лимит символов. Текст будет обрезан при
                      сохранении.
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {examples.length > 0 && (
        <Button onClick={onSave} disabled={isSaving}>
          Сохранить образцы
        </Button>
      )}
    </div>
  );
}
