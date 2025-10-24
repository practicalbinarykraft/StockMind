import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { SceneCard } from './scene-card';
import { HistoryModal } from './history-modal';
import { Sparkles, History, CheckCircle2, RefreshCw } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';

interface Scene {
  id: number;
  text: string;
}

interface SceneRecommendation {
  id: number;
  sceneId: number;
  priority: 'high' | 'medium' | 'low';
  area: 'hook' | 'structure' | 'emotional' | 'cta' | 'general';
  currentText: string;
  suggestedText: string;
  reasoning: string;
  expectedImpact: string;
  appliedAt?: string;
}

interface SceneEditorProps {
  projectId: string;
  scenes: Scene[];
  onReanalyze?: () => void;
}

export function SceneEditor({ projectId, scenes: initialScenes, onReanalyze }: SceneEditorProps) {
  const [scenes, setScenes] = useState(initialScenes);
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();

  // Fetch recommendations
  const { data: recommendations = [] } = useQuery<SceneRecommendation[]>({
    queryKey: ['/api/projects', projectId, 'scene-recommendations'],
  });

  // Apply single recommendation
  const applyRecommendationMutation = useMutation({
    mutationFn: async (recommendationId: number) => {
      return apiRequest('POST', `/api/projects/${projectId}/apply-scene-recommendation`, { recommendationId });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'scene-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'script-history'] });
      
      // Update local scene text
      if (data.affectedScene) {
        setScenes(prev => prev.map(s => 
          s.id === data.affectedScene.id 
            ? { ...s, text: data.affectedScene.text }
            : s
        ));
      }

      toast({
        title: 'Рекомендация применена',
        description: data.needsReanalysis 
          ? 'Текст обновлен. Рекомендуем пересчитать анализ.'
          : 'Сцена обновлена',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось применить рекомендацию',
        variant: 'destructive',
      });
    },
  });

  // Apply all recommendations
  const applyAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/projects/${projectId}/apply-all-recommendations`, {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'scene-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'script-history'] });
      
      // Update all scenes
      if (data.updatedScenes) {
        setScenes(data.updatedScenes);
      }

      toast({
        title: 'Все рекомендации применены',
        description: `Обновлено сцен: ${data.appliedCount}. Рекомендуем пересчитать анализ.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось применить рекомендации',
        variant: 'destructive',
      });
    },
  });

  // Edit scene text
  const editSceneMutation = useMutation({
    mutationFn: async ({ sceneId, newText }: { sceneId: number; newText: string }) => {
      return apiRequest('POST', `/api/projects/${projectId}/edit-scene`, { sceneId, newText });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'script-history'] });
      
      toast({
        title: 'Сцена обновлена',
        description: data.needsReanalysis 
          ? 'Изменения сохранены. Рекомендуем пересчитать анализ.'
          : 'Изменения сохранены',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось сохранить изменения',
        variant: 'destructive',
      });
    },
  });

  const handleTextChange = (sceneId: number, newText: string) => {
    // Optimistic update
    setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, text: newText } : s));
    
    // Save to backend
    editSceneMutation.mutate({ sceneId, newText });
  };

  const activeRecommendations = recommendations.filter(r => !r.appliedAt);
  const hasRecommendations = activeRecommendations.length > 0;

  return (
    <div className="space-y-4" data-testid="scene-editor">
      {/* Header with actions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
          <div>
            <h2 className="text-lg font-semibold">Редактор сцен</h2>
            <p className="text-sm text-muted-foreground">
              {hasRecommendations 
                ? `${activeRecommendations.length} активных рекомендаций`
                : 'Все рекомендации применены'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(true)}
              className="gap-1.5"
              data-testid="button-show-history"
            >
              <History className="h-4 w-4" />
              История
            </Button>
            {onReanalyze && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReanalyze}
                className="gap-1.5"
                data-testid="button-reanalyze"
              >
                <RefreshCw className="h-4 w-4" />
                Пересчитать
              </Button>
            )}
          </div>
        </CardHeader>

        {hasRecommendations && (
          <CardContent>
            <Button
              onClick={() => applyAllMutation.mutate()}
              disabled={applyAllMutation.isPending || applyRecommendationMutation.isPending}
              className="w-full gap-2"
              data-testid="button-apply-all"
            >
              {applyAllMutation.isPending ? (
                <>Применяем...</>
              ) : applyRecommendationMutation.isPending ? (
                <>Применяем рекомендацию...</>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Применить все рекомендации ({activeRecommendations.length})
                </>
              )}
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Scenes grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {scenes.map((scene, index) => {
          const sceneRecommendations = recommendations.filter(r => r.sceneId === scene.id);
          
          return (
            <SceneCard
              key={scene.id}
              sceneNumber={index + 1}
              sceneId={scene.id}
              text={scene.text}
              recommendations={sceneRecommendations}
              onTextChange={handleTextChange}
              onApplyRecommendation={(recId) => applyRecommendationMutation.mutateAsync(recId)}
              isEditing={editSceneMutation.isPending || applyRecommendationMutation.isPending}
              isApplyingAll={applyAllMutation.isPending}
            />
          );
        })}
      </div>

      {/* History modal */}
      {showHistory && (
        <HistoryModal
          projectId={projectId}
          currentScenes={scenes}
          onClose={() => setShowHistory(false)}
          onRevert={(scenes: Scene[]) => setScenes(scenes)}
        />
      )}
    </div>
  );
}
