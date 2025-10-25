import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { History, RotateCcw, CheckCircle2, User, Sparkles, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { queryClient, apiRequest } from '@/lib/query-client';
interface Scene {
  id: number;
  text: string;
}

interface SceneDiff {
  sceneId: number;
  before: string;
  after: string;
}

interface Provenance {
  source: string;
  agent?: string;
  userId?: string;
  ts: string;
  revertedToVersion?: number;
}

interface ScriptVersion {
  id: number;
  projectId: string;
  versionNumber: number;
  scenes: Scene[];
  createdBy: 'user' | 'ai' | 'system';
  changes?: any;
  parentVersionId?: number;
  analysisResult?: any;
  analysisScore?: number;
  provenance?: Provenance;
  diff?: SceneDiff[];
  createdAt: string;
}

interface HistoryModalProps {
  projectId: string;
  currentScenes: Scene[];
  onClose: () => void;
  onRevert: (scenes: Scene[]) => void;
}

const createdByConfig = {
  user: { icon: User, label: 'Пользователь', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  ai: { icon: Sparkles, label: 'AI', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  system: { icon: CheckCircle2, label: 'Система', color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
};

export function HistoryModal({ projectId, currentScenes, onClose, onRevert }: HistoryModalProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch version history
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'script-history'],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/script-history`);
      if (!res.ok) throw new Error('Failed to fetch history');
      const response = await res.json();
      // Unwrap new API format: { success: true, data: {...} }
      return response.data || response;
    },
  });
  
  const versions = (historyData?.versions || []) as ScriptVersion[];

  // Revert to version mutation
  const revertMutation = useMutation({
    mutationFn: async (versionId: number) => {
      return apiRequest('POST', `/api/projects/${projectId}/revert-to-version`, { versionId });
    },
    onSuccess: (response: any) => {
      const data = response.data; // Unwrap new API format
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'script-history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'scene-recommendations'] });
      
      if (data.newVersion?.scenes) {
        onRevert(data.newVersion.scenes);
      }

      toast({
        title: 'Версия восстановлена',
        description: data.message || 'Изменения применены',
      });
      
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось восстановить версию',
        variant: 'destructive',
      });
    },
  });

  const selectedVersion = versions.find(v => v.id === selectedVersionId);
  const previewScenes = selectedVersion?.scenes || currentScenes;
  const hasDiff = selectedVersion?.diff && selectedVersion.diff.length > 0;

  const getChangeLabel = (version: ScriptVersion) => {
    if (!version.changes) return 'Изменения';
    
    const { type } = version.changes;
    if (type === 'scene_recommendation') return 'Применена рекомендация';
    if (type === 'bulk_apply') return 'Применены все рекомендации';
    if (type === 'manual_edit') return 'Ручное редактирование';
    if (type === 'revert') return 'Откат версии';
    if (type === 'initial') return 'Начальная версия';
    
    return 'Изменения';
  };
  
  const getProvenanceLabel = (provenance?: Provenance) => {
    if (!provenance) return null;
    
    const labels: Record<string, string> = {
      'ai_recommendation': 'AI рекомендация',
      'bulk_apply': 'Массовое применение',
      'manual_edit': 'Ручное изменение',
      'revert': 'Откат версии',
      'initial': 'Инициализация',
    };
    
    return labels[provenance.source] || provenance.source;
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh]" data-testid="modal-history">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            История версий
          </DialogTitle>
          <DialogDescription>
            Просмотр и восстановление предыдущих версий сценария
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4">
          {/* Left: Version list */}
          <div className="col-span-1 space-y-2">
            <h3 className="text-sm font-medium">Версии</h3>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {isLoading ? (
                  <div className="text-sm text-muted-foreground">Загрузка...</div>
                ) : versions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">История пуста</div>
                ) : (
                  versions.map((version) => {
                    const isSelected = version.id === selectedVersionId;
                    const isCurrent = version.versionNumber === versions[0]?.versionNumber;
                    const CreatedByIcon = createdByConfig[version.createdBy].icon;

                    return (
                      <button
                        key={version.id}
                        onClick={() => setSelectedVersionId(version.id)}
                        className={`w-full rounded-md border p-3 text-left transition-colors hover-elevate ${
                          isSelected ? 'border-primary bg-primary/5' : ''
                        }`}
                        data-testid={`version-item-${version.id}`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">v{version.versionNumber}</span>
                            {isCurrent && (
                              <Badge variant="default" className="text-xs">
                                Текущая
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <CreatedByIcon className="h-3.5 w-3.5" />
                            <Badge
                              variant="outline"
                              className={`${createdByConfig[version.createdBy].color} text-xs`}
                            >
                              {createdByConfig[version.createdBy].label}
                            </Badge>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {getChangeLabel(version)}
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(version.createdAt), {
                              addSuffix: true,
                              locale: ru,
                            })}
                          </div>

                          {version.analysisScore !== undefined && version.analysisScore !== null && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Sparkles className="h-3 w-3 text-yellow-500" />
                              <span className="font-medium">{version.analysisScore}/100</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Preview with split-view diff */}
          <div className="col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">
                  {selectedVersion ? `Просмотр v${selectedVersion.versionNumber}` : 'Текущая версия'}
                </h3>
                {selectedVersion?.provenance && (
                  <Badge variant="outline" className="text-xs">
                    {getProvenanceLabel(selectedVersion.provenance)}
                  </Badge>
                )}
              </div>
              {selectedVersion && (
                <Button
                  size="sm"
                  onClick={() => revertMutation.mutate(selectedVersion.id)}
                  disabled={revertMutation.isPending}
                  className="gap-1.5"
                  data-testid="button-revert-version"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {revertMutation.isPending ? 'Восстановление...' : 'Восстановить'}
                </Button>
              )}
            </div>

            <ScrollArea className="h-[500px]">
              {hasDiff ? (
                /* Split-view diff */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 border-b pb-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      До изменения
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      После изменения
                    </div>
                  </div>
                  
                  {selectedVersion.diff!.map((diff) => (
                    <div key={diff.sceneId} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-semibold text-primary">
                          {diff.sceneId}
                        </div>
                        <span className="text-sm font-medium">Сцена {diff.sceneId}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-md border border-red-500/20 bg-red-500/5 p-3">
                          <p className="text-sm">{diff.before}</p>
                        </div>
                        <div className="rounded-md border border-green-500/20 bg-green-500/5 p-3">
                          <p className="text-sm">{diff.after}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Simple preview */
                <div className="space-y-3">
                  {previewScenes.map((scene, index) => (
                    <div
                      key={scene.id}
                      className="rounded-md border bg-card p-3"
                      data-testid={`preview-scene-${scene.id}`}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-semibold text-primary">
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium">Сцена {index + 1}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{scene.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
