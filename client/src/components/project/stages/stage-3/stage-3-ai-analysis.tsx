import { useState, useEffect } from "react";
import { type AdvancedScoreResult } from "@shared/advanced-analysis-types";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/query-client";

// Import all hooks
import { type Stage3Props, type AIAnalysis } from "./types/analysis-types";
import { useScriptVersions } from "./hooks/use-script-versions";
import { useVersionMutations } from "./hooks/use-version-mutations";
import { useReanalysisMutation } from "./hooks/use-reanalysis-mutation";
import { useReanalysisPolling } from "./hooks/use-reanalysis-polling";
import { useSourceAnalysis } from "./hooks/use-source-analysis";
import { useGenerateScript } from "./hooks/use-generate-script";
import { useAdvancedAnalysis } from "./hooks/use-advanced-analysis";
import { useLegacyAnalysis } from "./hooks/use-legacy-analysis";
import { useCachedAnalysis } from "./hooks/use-cached-analysis";
import { useSaveMutations } from "./hooks/use-save-mutations";

// Import components
import { SceneEditorMode } from "./components/SceneEditorMode";
import { LegacyAnalysisMode } from "./components/LegacyAnalysisMode";
import { Step3_1_LoadSource } from "./components/Step3_1_LoadSource";
import { Step3_2_Constructor } from "./components/Step3_2_Constructor";
import { CreateScriptScreen } from "./components/CreateScriptScreen";
import { SourceReviewMode } from "./components/SourceReviewMode";

export function Stage3AIAnalysis({
  project,
  stepData,
  step3Data,
}: Stage3Props) {
  const { toast } = useToast();

  // Determine current step: if step3Data has generatedVariants or step === "constructor", we're on step 3.2
  // Check both step3Data.data (from DB) and step3Data directly (from props)
  const step3DataContent = step3Data?.data || step3Data;
  const hasGeneratedVariants = !!(
    step3DataContent?.generatedVariants ||
    step3DataContent?.step === "constructor"
  );

  const currentStep = hasGeneratedVariants ? "constructor" : "load";

  // Initialize generatedData from step3Data if available
  const initialGeneratedData = step3DataContent?.generatedVariants
    ? {
        scenes:
          step3DataContent.generatedVariants.scenes ||
          step3DataContent.scenes ||
          [],
        variants:
          step3DataContent.generatedVariants.variants ||
          step3DataContent.variants ||
          {},
      }
    : null;

  // State management
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [currentStepState, setCurrentStepState] = useState<
    "load" | "constructor"
  >(currentStep);
  const [generatedData, setGeneratedData] = useState<{
    scenes: any[];
    variants: Record<
      number,
      Array<{ id: string; text: string; score?: number }>
    >;
  } | null>(initialGeneratedData);

  // Update currentStepState when step3Data changes
  useEffect(() => {
    const step3DataContent = step3Data?.data || step3Data;
    const hasGeneratedVariants = !!(
      step3DataContent?.generatedVariants ||
      step3DataContent?.step === "constructor"
    );
    if (hasGeneratedVariants && currentStepState === "load") {
      setCurrentStepState("constructor");
      const newGeneratedData = step3DataContent?.generatedVariants
        ? {
            scenes:
              step3DataContent.generatedVariants.scenes ||
              step3DataContent.scenes ||
              [],
            variants:
              step3DataContent.generatedVariants.variants ||
              step3DataContent.variants ||
              {},
          }
        : null;
      if (newGeneratedData) {
        setGeneratedData(newGeneratedData);
      }
    }
  }, [step3Data]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [reanalyzeJobId, setReanalyzeJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [advancedAnalysis, setAdvancedAnalysis] =
    useState<AdvancedScoreResult | null>(null);
  const [analysisMode, setAnalysisMode] = useState<"simple" | "advanced">(
    "advanced"
  );
  // Initialize selectedFormat from stepData if available (from analysis recommendation)
  const [selectedFormat, setSelectedFormat] = useState<string>(
    stepData?.recommendedFormat || stepData?.selectedFormat || "news"
  );
  const [selectedVariants, setSelectedVariants] = useState<
    Record<number, number>
  >({});
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [recoveryError, setRecoveryError] = useState<any>(null);
  const [failedFormatId, setFailedFormatId] = useState<string | null>(null);
  const [editedScenes, setEditedScenes] = useState<Record<number, string>>({});
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [reanalyzeDialogOpen, setReanalyzeDialogOpen] = useState(false);
  const [variantScores, setVariantScores] = useState<Record<string, number>>(
    {}
  );
  const [scoringVariant, setScoringVariant] = useState<string | null>(null);
  const [analysisTime, setAnalysisTime] = useState<number | undefined>(
    undefined
  );
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<"ru" | "en">("ru");

  // Feature flag check
  const STAGE3_MAGIC_UI = true;

  // Get content from step data
  const content =
    stepData?.content || stepData?.text || stepData?.transcription || "";

  // Use all hooks
  const {
    scriptVersionsQuery,
    hasScript,
    hasCandidate,
    currentVersion,
    candidateVersion,
  } = useScriptVersions(project);
  const { acceptMutation, rejectMutation } = useVersionMutations(project.id);
  const { reanalyzeMutation, lastSubmittedPayload } = useReanalysisMutation(
    project.id,
    setReanalyzeJobId,
    setJobStatus,
    setCompareOpen
  );

  useReanalysisPolling(
    project.id,
    reanalyzeJobId,
    setReanalyzeJobId,
    setJobStatus,
    setCompareOpen,
    lastSubmittedPayload
  );

  const {
    shouldAnalyze,
    setShouldAnalyze,
    sourceAnalysisQuery,
    handleStartAnalysis,
    sourceData,
  } = useSourceAnalysis(project, hasScript, content, stepData);

  const { generateMutation, handleGenerateScript } = useGenerateScript(
    project.id,
    targetLanguage,
    scriptVersionsQuery,
    setRecoveryError,
    setFailedFormatId,
    setRecoveryModalOpen
  );

  const { advancedAnalyzeMutation } = useAdvancedAnalysis(
    project,
    stepData,
    content,
    selectedFormat,
    setAdvancedAnalysis,
    setAnalysisTime
  );

  const { analyzeMutation, scoreVariantMutation } = useLegacyAnalysis(
    project.id,
    content,
    setAnalysis,
    setSelectedFormat,
    setVariantScores,
    setScoringVariant
  );

  useCachedAnalysis(
    project.id,
    step3Data,
    setShouldAnalyze,
    setAdvancedAnalysis,
    setAnalysisMode,
    setAnalysisTime,
    setSelectedFormat,
    setAnalysis,
    setSelectedVariants,
    setEditedScenes,
    setVariantScores
  );

  const { saveStepMutation, updateProjectMutation, handleProceed } =
    useSaveMutations(
      project.id,
      analysisMode,
      advancedAnalysis,
      analysisTime,
      selectedFormat,
      analysis,
      selectedVariants,
      editedScenes,
      variantScores,
      STAGE3_MAGIC_UI,
      hasScript,
      scriptVersionsQuery,
      candidateVersion,
      reanalyzeJobId
    );

  // Helper functions
  const handleAnalyze = () => {
    if (advancedAnalysis || analysis) {
      setReanalyzeDialogOpen(true);
    } else {
      if (analysisMode === "advanced") {
        advancedAnalyzeMutation.mutate();
      } else {
        analyzeMutation.mutate(selectedFormat);
      }
    }
  };

  const confirmReanalyze = () => {
    setReanalyzeDialogOpen(false);
    if (analysisMode === "advanced") {
      advancedAnalyzeMutation.mutate();
    } else {
      analyzeMutation.mutate(selectedFormat);
    }
  };

  const handleOpenCompare = () => {
    console.log(
      "[Compare] Click - hasCandidate:",
      hasCandidate,
      "jobRunning:",
      !!reanalyzeJobId
    );
    setCompareOpen(true);
  };

  // Handle Step 3.1: Generate script variants with timeout
  const handleGenerateFromStep3_1 = async (data: {
    sourceContent: string;
    format: string;
    customPrompt?: string;
  }) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout

    try {
      // Create fetch with abort signal
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const fetchRes = await fetch("/api/scripts/generate-variants", {
        method: "POST",
        headers,
        body: JSON.stringify({
          sourceText: data.sourceContent,
          prompt: data.customPrompt || "",
          format: data.format,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!fetchRes.ok) {
        const error = await fetchRes.json();
        throw new Error(error.error || "Не удалось сгенерировать варианты");
      }

      const response = await fetchRes.json();
      const result = response.data || response;

      // Save step 3.1 data
      await apiRequest("POST", `/api/projects/${project.id}/steps`, {
        stepNumber: 3,
        data: {
          sourceContent: data.sourceContent,
          format: data.format,
          customPrompt: data.customPrompt,
          generatedVariants: {
            scenes: result.scenes || [],
            variants: result.variants || {},
          },
          step: "constructor",
        },
      });

      setGeneratedData({
        scenes: result.scenes || [],
        variants: result.variants || {},
      });
      setCurrentStepState("constructor");

      toast({
        title: "Сценарий сгенерирован",
        description: "Выберите варианты для каждой сцены",
      });
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError" || error.message?.includes("aborted")) {
        toast({
          title: "Генерация отменена",
          description:
            "Генерация заняла слишком много времени. Попробуйте ещё раз или уменьшите объём текста.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Ошибка генерации",
          description: error.message || "Не удалось сгенерировать варианты",
          variant: "destructive",
        });
      }
    }
  };

  // Handle Step 3.2: Complete script
  const handleCompleteFromStep3_2 = async (finalScript: {
    scenes: any[];
    selectedVariants: Record<number, string>;
    totalWords: number;
    duration: number;
    aiScore?: number;
  }) => {
    try {
      // Save final script
      await apiRequest("POST", `/api/projects/${project.id}/steps`, {
        stepNumber: 3,
        data: {
          ...step3Data,
          finalScript,
          completed: true,
        },
      });

      // Proceed to next stage
      handleProceed();
    } catch (error: any) {
      toast({
        title: "Ошибка сохранения",
        description: error.message || "Не удалось сохранить сценарий",
        variant: "destructive",
      });
    }
  };

  // NEW FLOW: CreateScriptScreen (unified) + Constructor
  // Check if we should use new unified flow
  const useNewFlow =
    !STAGE3_MAGIC_UI || (currentStepState === "load" && !generatedData);

  // if (useNewFlow) {
  //   // if (currentStepState === "load") {
  //   //   return (
  //   //     <CreateScriptScreen
  //   //       project={project}
  //   //       stepData={stepData}
  //   //       onGenerate={handleGenerateFromStep3_1}
  //   //       isLoading={false}
  //   //     />
  //   //   );
  //   // }
  if (currentStepState === "constructor" && generatedData) {
    return (
      <Step3_2_Constructor
        project={project}
        step3Data={step3Data}
        scenes={generatedData.scenes}
        variants={generatedData.variants}
        onBack={() => setCurrentStepState("load")}
        onComplete={handleCompleteFromStep3_2}
      />
    );
  }
  // if (!hasScript ) {
  //   return (
  //     <SourceReviewMode
  //       project={project}
  //       stepData={stepData}
  //       sourceData={sourceData}
  //       hasScript={hasScript}
  //       shouldAnalyze={shouldAnalyze}
  //       handleStartAnalysis={handleStartAnalysis}
  //       sourceAnalysisQuery={sourceAnalysisQuery}
  //       handleGenerateScript={handleGenerateScript}
  //       generateMutation={generateMutation}
  //       targetLanguage={targetLanguage}
  //       setTargetLanguage={setTargetLanguage}
  //       showFormatModal={showFormatModal}
  //       setShowFormatModal={setShowFormatModal}
  //       compareOpen={compareOpen}
  //       setCompareOpen={setCompareOpen}
  //       currentVersion={currentVersion}
  //       candidateVersion={candidateVersion}
  //       reanalyzeJobId={reanalyzeJobId}
  //       jobStatus={jobStatus}
  //       handleProceed={handleProceed}
  //     />
  //   );
  // }

  // MODE 2: Scene editor mode (STAGE3_MAGIC_UI enabled, script exists)
  if (hasScript) {
    return (
      <SceneEditorMode
        project={project}
        sourceData={sourceData}
        scriptVersionsQuery={scriptVersionsQuery}
        candidateVersion={candidateVersion}
        reanalyzeJobId={reanalyzeJobId}
        jobStatus={jobStatus}
        lastSubmittedPayload={lastSubmittedPayload}
        hasCandidate={hasCandidate}
        compareOpen={compareOpen}
        targetLanguage={targetLanguage}
        reanalyzeMutation={reanalyzeMutation}
        acceptMutation={acceptMutation}
        rejectMutation={rejectMutation}
        updateProjectMutation={updateProjectMutation}
        setCompareOpen={setCompareOpen}
        handleOpenCompare={handleOpenCompare}
        handleProceed={handleProceed}
      />
    );
  }

  if (currentStepState === "load") {
    //   //   return (
    //   //     <CreateScriptScreen
    //   //       project={project}
    //   //       stepData={stepData}
    //   //       onGenerate={handleGenerateFromStep3_1}
    //   //       isLoading={false}
    //   //     />
    //   //   );
    //   // }

    return <>нету нифига</>;
  }

  return <>нету нифига</>;
  // }
  // }

  // MODE 1: Source review mode (STAGE3_MAGIC_UI enabled, no script yet)
  //

  //   // MODE 3: Legacy Analysis Mode (when feature flag is off OR script exists)
  //   return (
  //     <LegacyAnalysisMode
  //       project={project}
  //       stepData={stepData}
  //       content={content}
  //       selectedFormat={selectedFormat}
  //       setSelectedFormat={setSelectedFormat}
  //       analysis={analysis}
  //       advancedAnalysis={advancedAnalysis}
  //       analysisTime={analysisTime}
  //       analyzeMutation={analyzeMutation}
  //       advancedAnalyzeMutation={advancedAnalyzeMutation}
  //       scoreVariantMutation={scoreVariantMutation}
  //       handleAnalyze={handleAnalyze}
  //       confirmReanalyze={confirmReanalyze}
  //       reanalyzeDialogOpen={reanalyzeDialogOpen}
  //       setReanalyzeDialogOpen={setReanalyzeDialogOpen}
  //       editedScenes={editedScenes}
  //       setEditedScenes={setEditedScenes}
  //       isEditing={isEditing}
  //       setIsEditing={setIsEditing}
  //       selectedVariants={selectedVariants}
  //       setSelectedVariants={setSelectedVariants}
  //       variantScores={variantScores}
  //       setVariantScores={setVariantScores}
  //       scoringVariant={scoringVariant}
  //       setScoringVariant={setScoringVariant}
  //       updateProjectMutation={updateProjectMutation}
  //       handleProceed={handleProceed}
  //       hasCandidate={hasCandidate}
  //       currentVersion={currentVersion}
  //       candidateVersion={candidateVersion}
  //       compareOpen={compareOpen}
  //       setCompareOpen={setCompareOpen}
  //       handleOpenCompare={handleOpenCompare}
  //       reanalyzeJobId={reanalyzeJobId}
  //       jobStatus={jobStatus}
  //       recoveryModalOpen={recoveryModalOpen}
  //       setRecoveryModalOpen={setRecoveryModalOpen}
  //       recoveryError={recoveryError}
  //       failedFormatId={failedFormatId}
  //       generateMutation={generateMutation}
  //       toast={toast}
  //     />
  //   );
  // }
}
