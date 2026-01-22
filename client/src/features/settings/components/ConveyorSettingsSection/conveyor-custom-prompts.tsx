import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Textarea } from "@/shared/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Code } from "lucide-react";
import { useState } from "react";

export interface CustomPrompts {
  writerPrompt?: string;
  architectPrompt?: string;
}

interface ConveyorCustomPromptsProps {
  customPrompts: CustomPrompts | null;
  onPromptsChange: (prompts: CustomPrompts | null) => void;
  onSave: () => void;
  isSaving: boolean;
}

/**
 * Advanced custom prompts editor for Writer and Architect agents
 */
export function ConveyorCustomPrompts({
  customPrompts,
  onPromptsChange,
  onSave,
  isSaving,
}: ConveyorCustomPromptsProps) {
  const [showEditor, setShowEditor] = useState(false);

  const updatePrompt = (key: keyof CustomPrompts, value: string) => {
    onPromptsChange({
      ...customPrompts,
      [key]: value || undefined,
    });
  };

  return (
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
          onClick={() => setShowEditor(!showEditor)}
        >
          {showEditor ? "Скрыть" : "Показать"}
        </Button>
      </div>

      {showEditor && (
        <Tabs defaultValue="writer" className="w-full">
          <TabsList>
            <TabsTrigger value="writer">Writer Agent</TabsTrigger>
            <TabsTrigger value="architect">Architect Agent</TabsTrigger>
          </TabsList>

          <TabsContent value="writer" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Кастомный промпт для агента-сценариста. Оставьте пустым для
              использования по умолчанию.
            </p>
            <Textarea
              value={customPrompts?.writerPrompt || ""}
              onChange={(e) => updatePrompt("writerPrompt", e.target.value)}
              placeholder="Используйте переменные: {{FORMAT}}, {{KEY_FACTS}}, {{UNIQUE_ANGLE}}, {{SOURCE_CONTENT}}, {{TARGET_AUDIENCE}}, {{EMOTIONAL_ANGLES}}"
              rows={10}
              className="font-mono text-sm"
            />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <strong>Доступные переменные:</strong>
              </p>
              <p>
                {"{{FORMAT}}, {{SUGGESTED_HOOK}}, {{KEY_FACTS}}, {{UNIQUE_ANGLE}}, {{EMOTIONAL_ANGLES}}, {{TARGET_AUDIENCE}}, {{SOURCE_TITLE}}, {{SOURCE_CONTENT}}"}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="architect" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Кастомный промпт для агента-архитектора. Оставьте пустым для
              использования по умолчанию.
            </p>
            <Textarea
              value={customPrompts?.architectPrompt || ""}
              onChange={(e) => updatePrompt("architectPrompt", e.target.value)}
              placeholder="Используйте переменные: {{MAIN_TOPIC}}, {{SUB_TOPICS}}, {{TARGET_AUDIENCE}}, {{MIN_DURATION}}, {{MAX_DURATION}}, {{FORMATS_LIST}}"
              rows={10}
              className="font-mono text-sm"
            />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <strong>Доступные переменные:</strong>
              </p>
              <p>
                {"{{MAIN_TOPIC}}, {{SUB_TOPICS}}, {{TARGET_AUDIENCE}}, {{EMOTIONAL_ANGLES}}, {{CONTROVERSY_LEVEL}}, {{UNIQUE_ANGLE}}, {{SCORE}}, {{MIN_DURATION}}, {{MAX_DURATION}}, {{FORMATS_LIST}}"}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {showEditor && (
        <Button onClick={onSave} disabled={isSaving}>
          Сохранить промпты
        </Button>
      )}
    </div>
  );
}
