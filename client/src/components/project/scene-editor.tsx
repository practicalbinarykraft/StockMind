import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { SceneCard } from './scene-card';
import { HistoryModal } from './history-modal';
import { Sparkles, History, CheckCircle2, RefreshCw } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/query-client';

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
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/projects/${projectId}/scene-recommendations`);
      const json = await res.json();
      const result = json?.data ?? json ?? [];
      console.log('[SceneEditor] Recommendations loaded:', result.length, result);
      return result;
    },
  });

  // Apply single recommendation
  const applyRecommendationMutation = useMutation({
    mutationFn: async (recommendationId: number) => {
      const res = await apiRequest('POST', `/api/projects/${projectId}/apply-scene-recommendation`, { recommendationId });
      return await res.json();
    },
    onSuccess: (response: any) => {
      // Unwrap new API format: { success: true, data: { affectedScene, needsReanalysis } }
      const data = response?.data ?? response;
      
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'scene-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'script-history'] });
      
      // Update local scene text
      if (data?.affectedScene?.sceneNumber && data?.affectedScene?.text) {
        setScenes(prev => prev.map((s, idx) => 
          idx + 1 === data.affectedScene.sceneNumber
            ? { ...s, text: data.affectedScene.text }
            : s
        ));
      }

      toast({
        title: 'Рекомендация применена',
        description: data?.needsReanalysis 
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
      const res = await apiRequest('POST', `/api/projects/${projectId}/apply-all-recommendations`, {});
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'scene-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'script-history'] });
      
      // Update all scenes (data already unwrapped)
      if (data?.data?.updatedScenes) {
        setScenes(data.data.updatedScenes);
      }

      toast({
        title: 'Все рекомендации применены',
        description: `Обновлено сцен: ${data?.data?.appliedCount || 0}. Рекомендуем пересчитать анализ.`,
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
    mutationFn: async ({ sceneNumber, newText }: { sceneNumber: number; newText: string }) => {
      const res = await apiRequest('POST', `/api/projects/${projectId}/edit-scene`, { sceneNumber, newText });
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'script-history'] });
      
      toast({
        title: 'Сцена обновлена',
        description: data?.data?.needsReanalysis 
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

  const handleTextChange = (sceneNumber: number, newText: string) => {
    // Optimistic update - sceneNumber is 1-indexed, array is 0-indexed
    setScenes(prev => prev.map((s, idx) => idx + 1 === sceneNumber ? { ...s, text: newText } : s));
    
    // Save to backend
    editSceneMutation.mutate({ sceneNumber, newText });
  };

  const activeRecommendations = recommendations.filter(r => !r.appliedAt);
  const hasRecommendations = activeRecommendations.length > 0;

  return (
    <div className="flex gap-6" data-testid="scene-editor">
      {/* Left column: Scenes in single column */}
      <div className="flex-1 space-y-4">
        {scenes.map((scene, index) => {
          const sceneNumber = index + 1;
          const sceneRecommendations = recommendations.filter(r => r.sceneId === sceneNumber);
          
          return (
            <SceneCard
              key={sceneNumber}
              sceneNumber={sceneNumber}
              sceneId={sceneNumber}
              text={scene.text}
              recommendations={sceneRecommendations}
              onTextChange={(_, newText) => handleTextChange(sceneNumber, newText)}
              onApplyRecommendation={(recId) => applyRecommendationMutation.mutateAsync(recId)}
              isEditing={editSceneMutation.isPending || applyRecommendationMutation.isPending}
              isApplyingAll={applyAllMutation.isPending}
            />
          );
        })}
      </div>

      {/* Right column: Controls and metadata */}
      <div className="w-80 flex-shrink-0 space-y-4 sticky top-4 h-fit">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Инструменты</h2>
            <p className="text-sm text-muted-foreground">
              {hasRecommendations 
                ? `${activeRecommendations.length} активных рекомендаций`
                : 'Все рекомендации применены'}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasRecommendations && (
              <Button
                onClick={() => applyAllMutation.mutate()}
                disabled={applyAllMutation.isPending || applyRecommendationMutation.isPending}
                className="w-full gap-2"
                data-testid="button-apply-all"
              >
                {applyAllMutation.isPending ? (
                  <>Применяем...</>
                ) : applyRecommendationMutation.isPending ? (
                  <>Применяем...</>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Улучшить всё ({activeRecommendations.length})
                  </>
                )}
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={() => setShowHistory(true)}
              className="w-full gap-2"
              data-testid="button-show-history"
            >
              <History className="h-4 w-4" />
              История изменений
            </Button>
            
            {onReanalyze && (
              <Button
                variant="outline"
                onClick={onReanalyze}
                className="w-full gap-2"
                data-testid="button-reanalyze"
              >
                <RefreshCw className="h-4 w-4" />
                Пересчитать анализ
              </Button>
            )}
          </CardContent>
        </Card>
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
