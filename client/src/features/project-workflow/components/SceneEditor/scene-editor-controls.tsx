import { Button } from '@/shared/ui/button';
import { Card, CardHeader, CardContent } from '@/shared/ui/card';
import { Sparkles, History, Loader2, BarChart3 } from 'lucide-react';
import type { NormalizedScene } from './types';
import { CandidateStatusPanel } from './candidate-status-panel';

interface SceneEditorControlsProps {
  // Recommendations
  activeRecommendationsCount: number;
  hasRecommendations: boolean;
  // Mutations
  onAnalyze: () => void;
  isAnalyzing: boolean;
  onApplyAll: () => void;
  isApplyingAll: boolean;
  isApplyingSingle: boolean;
  // History
  onShowHistory: () => void;
  // Version management
  hasCandidate: boolean;
  reanalyzeJobId?: string | null;
  jobStatus?: { status: string };
  canSave: boolean;
  dirtySceneIds: Set<number>;
  scenes: NormalizedScene[];
  onReanalyze?: (scenes: NormalizedScene[], fullScript: string) => void;
  onOpenCompare?: () => void;
  onCancelCandidate: () => void;
  isCancellingCandidate: boolean;
  onSaveComplete: () => void;
}

/**
 * Controls panel for scene editor (right column)
 */
export function SceneEditorControls({
  activeRecommendationsCount,
  hasRecommendations,
  onAnalyze,
  isAnalyzing,
  onApplyAll,
  isApplyingAll,
  isApplyingSingle,
  onShowHistory,
  hasCandidate,
  reanalyzeJobId,
  jobStatus,
  canSave,
  dirtySceneIds,
  scenes,
  onReanalyze,
  onOpenCompare,
  onCancelCandidate,
  isCancellingCandidate,
  onSaveComplete,
}: SceneEditorControlsProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Инструменты</h2>
        <p className="text-sm text-muted-foreground">
          {hasRecommendations
            ? `${activeRecommendationsCount} активных рекомендаций`
            : 'Все рекомендации применены'}
        </p>
        {hasRecommendations && (
          <p className="text-xs text-muted-foreground pt-1">
            Выгодные: приоритет high/medium с приростом ≥6 баллов
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Analyze button */}
        <Button
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="w-full gap-2"
          data-testid="button-analyze-script"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Анализируем...
            </>
          ) : (
            <>
              <BarChart3 className="h-4 w-4" />
              Анализ сценария
            </>
          )}
        </Button>

        {/* Apply all button */}
        {hasRecommendations && (
          <Button
            onClick={onApplyAll}
            disabled={isApplyingAll || isApplyingSingle}
            className="w-full gap-2"
            variant="default"
            data-testid="button-apply-all"
          >
            {isApplyingAll ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Применяем...
              </>
            ) : isApplyingSingle ? (
              <>Применяем...</>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Применить всё (выгодные)
              </>
            )}
          </Button>
        )}

        {/* History button */}
        <Button
          variant="outline"
          onClick={onShowHistory}
          className="w-full gap-2"
          data-testid="button-show-history"
        >
          <History className="h-4 w-4" />
          Все версии (история)
        </Button>

        {/* Candidate status panel */}
        <CandidateStatusPanel
          hasCandidate={hasCandidate}
          reanalyzeJobId={reanalyzeJobId}
          jobStatus={jobStatus}
          canSave={canSave}
          dirtySceneIds={dirtySceneIds}
          scenes={scenes}
          onReanalyze={onReanalyze}
          onOpenCompare={onOpenCompare}
          onCancelCandidate={onCancelCandidate}
          isCancellingCandidate={isCancellingCandidate}
          onSaveComplete={onSaveComplete}
        />
      </CardContent>
    </Card>
  );
}
