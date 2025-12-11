import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useToast } from "@/hooks/use-toast";
import { type AIAnalysis } from "../types/analysis-types";

export function useSaveMutations(
  projectId: string,
  analysisMode: "simple" | "advanced",
  advancedAnalysis: any,
  analysisTime: number | undefined,
  selectedFormat: string,
  analysis: AIAnalysis | null,
  selectedVariants: Record<number, number>,
  editedScenes: Record<number, string>,
  variantScores: Record<string, number>,
  STAGE3_MAGIC_UI: boolean,
  hasScript: boolean,
  scriptVersionsQuery: any,
  candidateVersion: any,
  reanalyzeJobId: string | null
) {
  const { toast } = useToast();

  // Save step data mutation
  const saveStepMutation = useMutation({
    mutationFn: async (res: any | null) => {
      // Save data based on current analysis mode
      const dataToSave =
        // analysisMode === "advanced"
        //   ? {
        //       analysisMode: "advanced",
        //       advancedAnalysis,
        //       analysisTime,
        //       selectedFormat: selectedFormat || res.data.format,
        //     }
        //   :
        {
          analysisMode: "simple",
          selectedFormat: selectedFormat || res.data.format,
          selectedVariants:
            selectedVariants || res.data.finalScript.selectedVariants,
          editedScenes,
          variantScores,
          overallScore: analysis?.overallScore || res.data.finalScript.aiScore,
          overallComment: analysis?.overallComment,
          scenes: analysis?.scenes || res.data.finalScript.scenes,
        };

      return await apiRequest("POST", `/api/projects/${projectId}/steps`, {
        stepNumber: 3,
        data: dataToSave,
      });
    },
  });

  // Update project stage mutation
  const updateProjectMutation = useMutation({
    mutationFn: async (res: any | null) => {
      return await apiRequest("PATCH", `/api/projects/${projectId}`, {
        currentStage: 4,
      });
    },
    onSuccess: async () => {
      // Invalidate and wait for refetch to ensure UI updates
      await queryClient.invalidateQueries({
        queryKey: ["/api/projects", projectId],
      });
      await queryClient.refetchQueries({
        queryKey: ["/api/projects", projectId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["/api/projects", projectId, "steps"],
      });

      toast({
        title: "Analysis Saved",
        description: "Moving to Voice Generation...",
      });
    },
  });

  const handleProceed = async (res: any | null) => {
    // For STAGE3_MAGIC_UI: check activeVersion (candidate or current) metrics
    // For old UI: check global advancedAnalysis/analysis states
    // if (hasScript) {
    //   const current = scriptVersionsQuery.data?.currentVersion;
    //   const candidate = candidateVersion;
    //   const activeVersion = candidate ?? current;

    //   // Soft warning if analysis pending, but allow proceeding
    //   if (activeVersion && !activeVersion.metrics && reanalyzeJobId) {
    //     toast({
    //       title: "Анализ ещё выполняется",
    //       description:
    //         "Можно продолжить озвучку сейчас, анализ завершится в фоне.",
    //     });
    //     // Continue anyway - don't block
    //   }
    // } else {
    //   // Old UI logic: check global states
    //   if (!advancedAnalysis && !analysis) {
    //     toast({
    //       variant: "destructive",
    //       title: "Error",
    //       description: "Please complete the analysis first",
    //     });
    //     return;
    //   }
    // }

    try {
      if (res) {
        // Save step data first
        await saveStepMutation.mutateAsync(res);
        // Then update project stage (which will trigger navigation via refetch)
        await updateProjectMutation.mutateAsync(res);
      } else {
        await saveStepMutation.mutateAsync(null);
        // Then update project stage (which will trigger navigation via refetch)
        await updateProjectMutation.mutateAsync(null);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save and proceed",
      });
    }
  };

  return { saveStepMutation, updateProjectMutation, handleProceed };
}
