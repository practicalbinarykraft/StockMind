import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, RefreshCw, XCircle, Loader2 } from 'lucide-react';
import type { NormalizedScene } from './scene-editor-types';

interface CandidateStatusPanelProps {
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
 * Panel showing candidate version status and actions
 */
export function CandidateStatusPanel({
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
}: CandidateStatusPanelProps) {
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Новая версия</span>
        {reanalyzeJobId && jobStatus?.status === 'running' && (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Создаётся
          </Badge>
        )}
        {hasCandidate && !reanalyzeJobId && (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Готов
          </Badge>
        )}
        {!hasCandidate && !reanalyzeJobId && (
          <Badge variant="outline">Отсутствует</Badge>
        )}
      </div>

      {onReanalyze && !hasCandidate && !reanalyzeJobId && (
        <Button
          variant="outline"
          onClick={() => {
            const fullScript = scenes.map(s => s.text).join('\n\n');
            onReanalyze(scenes, fullScript);
            onSaveComplete();
          }}
          disabled={!canSave}
          className="w-full gap-2"
          data-testid="button-reanalyze"
          size="sm"
        >
          <RefreshCw className="h-4 w-4" />
          {dirtySceneIds.size > 0
            ? `Сохранить новую версию (изменено: ${dirtySceneIds.size})`
            : 'Сохранить новую версию'}
        </Button>
      )}

      {reanalyzeJobId && jobStatus?.status === 'running' && (
        <div className="text-xs text-muted-foreground">
          Создаём версию… ~10–60 сек
        </div>
      )}

      {onOpenCompare && hasCandidate && (
        <>
          <Button
            onClick={onOpenCompare}
            className="w-full gap-2"
            data-testid="button-open-compare"
            size="sm"
          >
            <CheckCircle2 className="h-4 w-4" />
            Сравнение: Текущая vs Новая
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onCancelCandidate}
            disabled={isCancellingCandidate}
            className="w-full gap-2 text-muted-foreground hover:text-destructive"
            data-testid="button-cancel-candidate"
          >
            <XCircle className="h-4 w-4" />
            Отменить версию
          </Button>
        </>
      )}
    </div>
  );
}
