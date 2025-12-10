import { type Project } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Edit2,
  GitCompareArrows,
  CheckCircle,
  X,
  Info,
  AlertCircle,
} from "lucide-react";
import { SourceSummaryBar } from "../../../source-summary-bar";
import { ReanalysisProgressCard } from "../../../reanalysis-progress-card";
import { SceneEditor } from "@/components/project/scene-editor";
import { CompareModal } from "../../../compare-modal";
import { CandidateVersionBanner } from "./CandidateVersionBanner";

interface SceneEditorModeProps {
  project: Project;
  sourceData: any;
  scriptVersionsQuery: any;
  candidateVersion: any;
  reanalyzeJobId: string | null;
  jobStatus: any;
  lastSubmittedPayload: any;
  hasCandidate: boolean;
  compareOpen: boolean;
  targetLanguage: "ru" | "en";
  reanalyzeMutation: any;
  acceptMutation: any;
  rejectMutation: any;
  updateProjectMutation: any;
  setCompareOpen: (open: boolean) => void;
  handleOpenCompare: () => void;
  handleProceed: () => void;
}

export function SceneEditorMode({
  project,
  sourceData,
  scriptVersionsQuery,
  candidateVersion,
  reanalyzeJobId,
  jobStatus,
  lastSubmittedPayload,
  hasCandidate,
  compareOpen,
  targetLanguage,
  reanalyzeMutation,
  acceptMutation,
  rejectMutation,
  updateProjectMutation,
  setCompareOpen,
  handleOpenCompare,
  handleProceed,
}: SceneEditorModeProps) {
  const current = scriptVersionsQuery.data?.currentVersion;
  const candidate = candidateVersion;

  // Show candidate if it exists (user just saved it), otherwise show current
  const versionToRender = candidate ?? current;

  // Extend sourceData with script language for Scene Editor mode
  const editorSourceData = {
    ...sourceData,
    scriptLanguage: versionToRender?.scriptLanguage || targetLanguage || "ru",
  };

  if (scriptVersionsQuery.isLoading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Загружаем сценарий...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!versionToRender) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Сценарий не найден. Пожалуйста, создайте новый сценарий.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Edit2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Редактор сценария</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Просмотрите и отредактируйте сцены, примените рекомендации AI
        </p>
      </div>

      <div className="space-y-4">
        <SourceSummaryBar source={editorSourceData} projectId={project.id} />

        {/* Reanalysis Progress Card // убрать*/}
        {jobStatus && (
          <ReanalysisProgressCard
            status={jobStatus.status}
            step={jobStatus.step}
            progress={jobStatus.progress}
            error={jobStatus.error}
            canRetry={jobStatus.canRetry}
            onRetry={() => {
              if (lastSubmittedPayload.current) {
                reanalyzeMutation.mutate(lastSubmittedPayload.current);
              }
            }}
          />
        )}

        {/* Candidate Version Banner // убрать*/}
        {hasCandidate && candidate && (
          <CandidateVersionBanner
            candidate={candidate}
            reanalyzeJobId={reanalyzeJobId}
            acceptMutation={acceptMutation}
            rejectMutation={rejectMutation}
            handleOpenCompare={handleOpenCompare}
          />
        )}

        <div data-testid="scene-editor">
          <SceneEditor
            projectId={project.id}
            scenes={versionToRender.scenes}
            activeVersionId={versionToRender.id}
            onReanalyze={(scenes, fullScript) => {
              if (reanalyzeMutation.isPending) return;
              reanalyzeMutation.mutate({ scenes, fullScript });
            }}
            onOpenCompare={handleOpenCompare}
            hasCandidate={hasCandidate}
            reanalyzeJobId={reanalyzeJobId}
            jobStatus={jobStatus}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            size="lg"
            onClick={handleProceed}
            disabled={updateProjectMutation.isPending}
            data-testid="button-proceed"
          >
            {updateProjectMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Сохраняем...
              </>
            ) : (
              <>Перейти к озвучке</>
            )}
          </Button>
        </div>
      </div>

      {/* Compare Modal // убрать*/}
      <CompareModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        projectId={project.id}
        reanalyzeJobId={reanalyzeJobId}
        jobStatus={jobStatus}
        onNavigateToVoice={handleProceed}
      />
    </div>
  );
}
