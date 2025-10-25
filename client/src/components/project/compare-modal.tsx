import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, ArrowRight, X } from "lucide-react";

interface CompareData {
  base: {
    versionId: string;
    overallScore: number;
    metrics: {
      estimatedRetention: string;
      estimatedSaves: string;
      estimatedShares: string;
    };
    scenes: Array<{
      sceneNumber: number;
      text: string;
      score: number;
    }>;
  };
  candidate: {
    versionId: string;
    overallScore: number;
    metrics: {
      estimatedRetention: string;
      estimatedSaves: string;
      estimatedShares: string;
    };
    scenes: Array<{
      sceneNumber: number;
      text: string;
      score: number;
    }>;
  };
  deltas: {
    overallScoreDelta: number;
    scenes: Array<{
      sceneNumber: number;
      scoreDelta: number;
    }>;
  };
}

interface CompareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: CompareData | null;
  onChoose: (choice: 'base' | 'candidate') => void;
  onBackToEdit: () => void;
  onProceedToVoice: () => void;
  isChoosing: boolean;
}

export function CompareModal({
  open,
  onOpenChange,
  data,
  onChoose,
  onBackToEdit,
  onProceedToVoice,
  isChoosing
}: CompareModalProps) {
  if (!data) return null;

  const DeltaBadge = ({ delta }: { delta: number }) => {
    const isPositive = delta > 0;
    const isNeutral = delta === 0;
    
    if (isNeutral) {
      return <Badge variant="outline" className="gap-1">0</Badge>;
    }
    
    return (
      <Badge 
        variant={isPositive ? "default" : "destructive"} 
        className="gap-1"
        data-testid={`badge-delta-${isPositive ? 'positive' : 'negative'}`}
      >
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {isPositive ? '+' : ''}{delta}
      </Badge>
    );
  };

  const VersionColumn = ({ 
    version, 
    title, 
    isPrimary 
  }: { 
    version: CompareData['base'] | CompareData['candidate']; 
    title: string;
    isPrimary: boolean;
  }) => (
    <div className="flex-1 space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <div className="text-4xl font-bold" data-testid={`text-score-${isPrimary ? 'base' : 'candidate'}`}>
          {version.overallScore}
          <span className="text-lg text-muted-foreground">/100</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Прогнозные метрики</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between" data-testid={`text-retention-${isPrimary ? 'base' : 'candidate'}`}>
            <span className="text-muted-foreground">Удержание:</span>
            <span className="font-medium">{version.metrics.estimatedRetention}</span>
          </div>
          <div className="flex justify-between" data-testid={`text-saves-${isPrimary ? 'base' : 'candidate'}`}>
            <span className="text-muted-foreground">Сохранения:</span>
            <span className="font-medium">{version.metrics.estimatedSaves}</span>
          </div>
          <div className="flex justify-between" data-testid={`text-shares-${isPrimary ? 'base' : 'candidate'}`}>
            <span className="text-muted-foreground">Репосты:</span>
            <span className="font-medium">{version.metrics.estimatedShares}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Сцены ({version.scenes.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-64 overflow-y-auto">
          {version.scenes.map((scene) => {
            const sceneDelta = data.deltas.scenes.find(d => d.sceneNumber === scene.sceneNumber);
            return (
              <div 
                key={scene.sceneNumber} 
                className="p-2 rounded border bg-card"
                data-testid={`scene-${isPrimary ? 'base' : 'candidate'}-${scene.sceneNumber}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Сцена {scene.sceneNumber}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold">{scene.score}</span>
                    {sceneDelta && !isPrimary && <DeltaBadge delta={sceneDelta.scoreDelta} />}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {scene.text}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Сравнение версий: ДО и ПОСЛЕ</span>
            <DeltaBadge delta={data.deltas.overallScoreDelta} />
          </DialogTitle>
          <DialogDescription>
            Выберите версию для продолжения работы
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-6 overflow-y-auto flex-1 py-4">
          <VersionColumn version={data.base} title="ДО (текущая)" isPrimary={true} />
          
          <div className="flex items-center justify-center">
            <ArrowRight className="h-8 w-8 text-muted-foreground" />
          </div>

          <VersionColumn version={data.candidate} title="ПОСЛЕ (новая)" isPrimary={false} />
        </div>

        <DialogFooter className="flex sm:justify-between gap-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onChoose('base')}
              disabled={isChoosing}
              data-testid="button-keep-base"
            >
              <X className="h-4 w-4 mr-1" />
              Оставить ДО
            </Button>
            <Button
              onClick={() => onChoose('candidate')}
              disabled={isChoosing}
              data-testid="button-choose-candidate"
            >
              Выбрать ПОСЛЕ
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={onBackToEdit}
              disabled={isChoosing}
              data-testid="button-back-to-edit"
            >
              Вернуться к редактированию
            </Button>
            <Button
              variant="default"
              onClick={onProceedToVoice}
              disabled={isChoosing}
              data-testid="button-proceed-voice"
            >
              Перейти к озвучке
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
