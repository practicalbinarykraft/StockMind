import { useState, useMemo, useRef, useEffect } from 'react';
import { SceneCard } from '../scene-card';
import { HistoryModal } from '../history-modal';

import {
  type Scene,
  type NormalizedScene,
  type AnalysisResult,
  type SceneEditorProps,
  normalizeScenes,
} from './types';
import { useSceneAnalysis } from './hooks/use-scene-analysis';
import { useSceneRecommendations } from './hooks/use-scene-recommendations';
import { useCancelCandidate } from './hooks/use-cancel-candidate';
import { SceneEditorControls } from './scene-editor-controls';
import { SceneAnalysisCard } from './scene-analysis-card';

export function SceneEditor({
  projectId,
  scenes: initialScenes,
  activeVersionId,
  onReanalyze,
  onOpenCompare,
  hasCandidate,
  reanalyzeJobId,
  jobStatus
}: SceneEditorProps) {
  // State
  const [scenesState, setScenesState] = useState(() => normalizeScenes(initialScenes));
  const [showHistory, setShowHistory] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [hasAppliedRecommendations, setHasAppliedRecommendations] = useState(false);
  const [dirtySceneIds, setDirtySceneIds] = useState<Set<number>>(new Set());
  const [baseVersionId, setBaseVersionId] = useState(activeVersionId);
  const initialTextsRef = useRef<Map<number, string>>(new Map());

  const scenes = scenesState;

  // Auto-normalize scenes wrapper
  const setScenes = (newScenes: any[] | ((prev: any[]) => any[])) => {
    setScenesState(prev => {
      const resolved = typeof newScenes === 'function' ? newScenes(prev) : newScenes;
      return normalizeScenes(resolved);
    });
  };

  // Initialize baseline texts on mount
  useEffect(() => {
    const m = new Map<number, string>();
    initialScenes.forEach((s: any, idx) => {
      const sceneNumber = s.sceneNumber !== undefined ? s.sceneNumber : (idx + 1);
      m.set(sceneNumber, (s.text ?? '').trim());
    });
    initialTextsRef.current = m;
  }, [initialScenes]);

  // Reset dirty flags when version changes
  useEffect(() => {
    if (activeVersionId !== baseVersionId) {
      setBaseVersionId(activeVersionId);
      setDirtySceneIds(new Set());
      setHasAppliedRecommendations(false);
    }
  }, [activeVersionId, baseVersionId]);

  // Check for changes
  const hasChanges = useMemo(() => {
    if (scenes.length !== initialScenes.length) return true;
    return scenes.some((s, idx) => s.text !== initialScenes[idx].text);
  }, [scenes, initialScenes]);

  const canSave = hasChanges || hasAppliedRecommendations || dirtySceneIds.size > 0;

  // Hooks
  const analyzeScriptMutation = useSceneAnalysis({
    projectId,
    scenes,
    activeVersionId,
    onSuccess: setAnalysisResult,
  });

  const {
    recommendations,
    activeRecommendations,
    applyRecommendationMutation,
    applyAllMutation,
  } = useSceneRecommendations({
    projectId,
    scenes,
    activeVersionId,
    analysisResult,
    setScenes,
    setAnalysisResult,
    setDirtySceneIds,
    setHasAppliedRecommendations,
  });

  const cancelCandidateMutation = useCancelCandidate({ projectId });

  const hasRecommendations = activeRecommendations.length > 0;

  // Handle text changes
  const handleTextChange = (sceneNumber: number, newText: string) => {
    setScenes((prev: NormalizedScene[]) =>
      prev.map(s => (s.sceneNumber === sceneNumber ? { ...s, text: newText } : s))
    );

    const baseline = (initialTextsRef.current.get(sceneNumber) ?? '').trim();
    const isModified = (newText ?? '').trim() !== baseline;

    setDirtySceneIds(prev => {
      const next = new Set(prev);
      if (isModified) next.add(sceneNumber);
      else next.delete(sceneNumber);
      return next;
    });

    if (isModified) setHasAppliedRecommendations(true);
  };

  return (
    <div className="flex gap-6" data-testid="scene-editor">
      {/* Left column: Scenes */}
      <div className="flex-1 space-y-4">
        {scenes.map((scene, index) => {
          const sceneNumber = scene.sceneNumber !== undefined ? scene.sceneNumber : (index + 1);
          const sceneRecommendations = recommendations.filter((r: any) => r.sceneId === sceneNumber);

          return (
            <SceneCard
              key={scene.id || sceneNumber}
              sceneNumber={sceneNumber}
              sceneId={sceneNumber}
              text={scene.text}
              recommendations={sceneRecommendations}
              onTextChange={(_, newText) => handleTextChange(sceneNumber, newText)}
              onApplyRecommendation={(rec) => applyRecommendationMutation.mutateAsync(rec)}
              isEditing={applyRecommendationMutation.isPending}
              isApplyingAll={applyAllMutation.isPending}
              isModified={dirtySceneIds.has(sceneNumber)}
            />
          );
        })}
      </div>

      {/* Right column: Controls and metadata */}
      <div className="w-80 flex-shrink-0 space-y-4 sticky top-4 h-fit">
        <SceneEditorControls
          activeRecommendationsCount={activeRecommendations.length}
          hasRecommendations={hasRecommendations}
          onAnalyze={() => analyzeScriptMutation.mutate()}
          isAnalyzing={analyzeScriptMutation.isPending}
          onApplyAll={() => applyAllMutation.mutate()}
          isApplyingAll={applyAllMutation.isPending}
          isApplyingSingle={applyRecommendationMutation.isPending}
          onShowHistory={() => setShowHistory(true)}
          hasCandidate={hasCandidate ?? false}
          reanalyzeJobId={reanalyzeJobId}
          jobStatus={jobStatus}
          canSave={canSave}
          dirtySceneIds={dirtySceneIds}
          scenes={scenes}
          onReanalyze={onReanalyze}
          onOpenCompare={onOpenCompare}
          onCancelCandidate={() => cancelCandidateMutation.mutate()}
          isCancellingCandidate={cancelCandidateMutation.isPending}
          onSaveComplete={() => {
            setHasAppliedRecommendations(false);
            setDirtySceneIds(new Set());
          }}
        />

        {analysisResult && <SceneAnalysisCard analysisResult={analysisResult} />}
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
