import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Edit, Trash2, Sparkles, Mic, LayoutIcon, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface ScriptCardProps {
  script: any;
  onEdit: (script: any) => void;
  onDelete: (script: any) => void;
  onAnalyze: (script: any) => void;
  onStartProduction: (script: any) => void;
  isDeleting?: boolean;
  isAnalyzing?: boolean;
  isStartingProduction?: boolean;
}

export function ScriptCard({
  script,
  onEdit,
  onDelete,
  onAnalyze,
  onStartProduction,
  isDeleting,
  isAnalyzing,
  isStartingProduction,
}: ScriptCardProps) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      draft: { label: "✏️ Draft", variant: "outline" },
      analyzed: { label: "🔍 Analyzed", variant: "secondary" },
      ready: { label: "✅ Ready", variant: "default" },
      in_production: { label: "🎬 In Production", variant: "default" },
      completed: { label: "✓ Completed", variant: "default" },
    };
    return variants[status] || { label: status, variant: "outline" as const };
  };

  const statusBadge = getStatusBadge(script.status);
  const scenes = Array.isArray(script.scenes) ? script.scenes : [];
  const firstSceneText = scenes[0]?.text || scenes[0] || "";

  return (
    <Card className="hover:border-primary transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
              {script.aiScore && (
                <Badge variant="outline">{script.aiScore}/100</Badge>
              )}
            </div>
            <CardTitle className="text-lg line-clamp-2">
              {script.title}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {firstSceneText}
        </p>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {scenes.length > 0 && (
            <div className="flex items-center gap-1">
              <LayoutIcon className="h-3 w-3" />
              <span>{scenes.length} сцен</span>
            </div>
          )}
          {script.durationSeconds && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{script.durationSeconds}s</span>
            </div>
          )}
          {script.format && (
            <Badge variant="outline" className="text-xs">
              {script.format}
            </Badge>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(script.updatedAt), {
            addSuffix: true,
            locale: ru,
          })}
        </div>

        <div className="flex gap-2 pt-2">
          {script.status === "draft" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAnalyze(script)}
              disabled={isAnalyzing}
              className="flex-1"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Анализ
            </Button>
          )}
          {script.status === "ready" && (
            <Button
              size="sm"
              onClick={() => onStartProduction(script)}
              disabled={isStartingProduction}
              className="flex-1"
            >
              <Mic className="h-3 w-3 mr-1" />
              Озвучить
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(script)}
            title={script.projectId ? "Открыть проект" : "Редактировать сценарий"}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(script)}
            disabled={isDeleting}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
