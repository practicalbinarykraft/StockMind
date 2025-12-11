import { type Project } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { SourceSummaryBar } from "../../../source-summary-bar";
import { SourceAnalysisCard } from "../../../source-analysis-card";
import { RecommendedFormatBox } from "../../../recommended-format-box";
import { CompareModal } from "../../../compare-modal";
import { FORMAT_TEMPLATES } from "../constants/format-templates";
import { LanguageSelector } from "./LanguageSelector";

interface SourceReviewModeProps {
  project: Project;
  stepData: any;
  sourceData: any;
  hasScript: boolean;
  shouldAnalyze: boolean;
  handleStartAnalysis: () => void;
  sourceAnalysisQuery: any;
  handleGenerateScript: (formatId: string) => void;
  generateMutation: any;
  targetLanguage: "ru" | "en";
  setTargetLanguage: (lang: "ru" | "en") => void;
  showFormatModal: boolean;
  setShowFormatModal: (show: boolean) => void;
  compareOpen: boolean;
  setCompareOpen: (open: boolean) => void;
  currentVersion: any;
  candidateVersion: any;
  reanalyzeJobId: string | null;
  jobStatus: any;
  handleProceed: (res: any | null) => void;
}

export function SourceReviewMode({
  project,
  sourceData,
  shouldAnalyze,
  handleStartAnalysis,
  sourceAnalysisQuery,
  handleGenerateScript,
  generateMutation,
  targetLanguage,
  setTargetLanguage,
  showFormatModal,
  setShowFormatModal,
  compareOpen,
  setCompareOpen,
  reanalyzeJobId,
  jobStatus,
  handleProceed,
}: SourceReviewModeProps) {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Анализ исходника </h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Просмотрите анализ и выберите формат для создания сценария
        </p>
      </div>

      <div className="space-y-4">
        <SourceSummaryBar source={sourceData} projectId={project.id} />

        {/* Manual trigger button - show if analysis not started and not cached */}
        {!shouldAnalyze &&
          !sourceAnalysisQuery.data &&
          !sourceAnalysisQuery.isLoading &&
          !sourceAnalysisQuery.isPlaceholderData && (
            <Card>
              <CardContent className="py-8">
                <div className="flex flex-col items-center gap-4">
                  <Sparkles className="h-12 w-12 text-primary" />
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold">Готовы к анализу?</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      AI проанализирует исходник и порекомендует оптимальный
                      формат для создания вирусного видео
                    </p>
                  </div>
                  <Button
                    onClick={handleStartAnalysis}
                    size="lg"
                    className="gap-2"
                    data-testid="button-start-analysis"
                  >
                    <Sparkles className="h-4 w-4" />
                    Начать анализ
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

        {sourceAnalysisQuery.isLoading && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium">Анализируем исходник...</p>
                <p className="text-sm text-muted-foreground">
                  Это займет несколько секунд
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {sourceAnalysisQuery.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {(sourceAnalysisQuery.error as any)?.message ||
                "Не удалось проанализировать исходник"}
            </AlertDescription>
          </Alert>
        )}

        {sourceAnalysisQuery.data && (
          <>
            <SourceAnalysisCard analysis={sourceAnalysisQuery.data.analysis} />

            <LanguageSelector
              targetLanguage={targetLanguage}
              setTargetLanguage={setTargetLanguage}
            />

            <RecommendedFormatBox
              recommendation={sourceAnalysisQuery.data.recommendedFormat}
              onApply={handleGenerateScript}
              onChooseOther={() => setShowFormatModal(true)}
              isLoading={generateMutation.isPending}
            />
          </>
        )}

        {generateMutation.isPending && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium">Генерируем сценарий...</p>
                <p className="text-sm text-muted-foreground">
                  Многоагентный AI анализ в процессе
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Format Selection Modal */}
      <Dialog open={showFormatModal} onOpenChange={setShowFormatModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Выберите формат</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
            {FORMAT_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="p-4 rounded-lg border-2 cursor-pointer transition-all hover-elevate border-border"
                onClick={() => {
                  handleGenerateScript(template.id);
                  setShowFormatModal(false);
                }}
                data-testid={`template-${template.id}`}
              >
                <h3 className="font-semibold mb-1">{template.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {template.description}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Compare Modal */}
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
