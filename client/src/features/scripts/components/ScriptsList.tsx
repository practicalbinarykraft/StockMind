import { Card, CardContent } from "@/shared/ui/card";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { ScriptCard } from "./ScriptCard";

interface ScriptsListProps {
  scripts: any[];
  isLoading?: boolean;
  activeTab?: string;
  onEdit: (script: any) => void;
  onDelete: (id: string) => void;
  onAnalyze: (id: string) => void;
  onStartProduction: (id: string) => void;
  onCreate?: () => void;
  isDeleting?: boolean;
  isAnalyzing?: boolean;
  isStartingProduction?: boolean;
}

export function ScriptsList({
  scripts,
  isLoading,
  activeTab = "all",
  onEdit,
  onDelete,
  onAnalyze,
  onStartProduction,
  onCreate,
  isDeleting,
  isAnalyzing,
  isStartingProduction,
}: ScriptsListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-4 bg-muted rounded w-3/4 animate-pulse mb-4" />
              <div className="h-4 bg-muted rounded w-full mb-2 animate-pulse" />
              <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (scripts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Нет сценариев</h3>
          <p className="text-sm text-muted-foreground mb-6">
            {activeTab === "all"
              ? "Создайте свой первый сценарий"
              : `Нет сценариев со статусом "${activeTab}"`}
          </p>
          {onCreate && (
            <Button onClick={onCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Создать сценарий
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {scripts.map((script) => (
        <ScriptCard
          key={script.id}
          script={script}
          onEdit={onEdit}
          onDelete={onDelete}
          onAnalyze={onAnalyze}
          onStartProduction={onStartProduction}
          isDeleting={isDeleting}
          isAnalyzing={isAnalyzing}
          isStartingProduction={isStartingProduction}
        />
      ))}
    </div>
  );
}
