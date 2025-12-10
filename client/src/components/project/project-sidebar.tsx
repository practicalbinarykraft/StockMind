import { useState } from "react";
import { type Project } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  FileText,
  Newspaper,
  Sparkles,
  Mic,
  Users,
  Download,
  Film,
  CheckCircle2,
  Circle,
  Lock,
  X,
  Radio,
  Instagram,
  FileCode,
  Settings,
  FastForward,
} from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useToast } from "@/hooks/use-toast";

const STAGES = [
  { number: 1, title: "Source Selection", icon: Radio, optional: false },
  { number: 2, title: "Content Input", icon: Newspaper, optional: false },
  { number: 3, title: "Сценарий", icon: Sparkles, optional: false },
  { number: 4, title: "Voice Generation", icon: Mic, optional: true },
  { number: 5, title: "Avatar Selection", icon: Users, optional: true },
  { number: 6, title: "Final Export", icon: Download, optional: false },
];

interface ProjectSidebarProps {
  project: Project;
  onClose?: () => void;
}

export function ProjectSidebar({ project, onClose }: ProjectSidebarProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // State for navigation warning dialog
  const [showNavigationWarning, setShowNavigationWarning] = useState(false);
  const [pendingStageNavigation, setPendingStageNavigation] = useState<
    number | null
  >(null);

  const currentStage = project.currentStage;

  // Fetch steps data to check which steps are skipped
  const { data: stepsData } = useQuery({
    queryKey: ["/api/projects", project.id, "steps"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${project.id}/steps`);
      if (!res.ok) throw new Error("Failed to fetch steps");
      return await res.json();
    },
  });

  console.log("project-sidebar", currentStage);

  // Helper function to check if a step is skipped
  const isStepSkipped = (stepNumber: number) => {
    if (!stepsData) return false;
    const step = stepsData.find((s: any) => s.stepNumber === stepNumber);
    return !!step?.skipReason;
  };

  // Helper function to check if a step is completed (has data or completedAt)
  const isStepCompleted = (stepNumber: number) => {
    if (!stepsData) return false;
    const step = stepsData.find((s: any) => s.stepNumber === stepNumber);
    return !!(step?.completedAt || step?.data || step?.skipReason);
  };

  // Calculate maximum reached stage from steps data (not just currentStage)
  // This ensures that completed stages remain accessible even when navigating back
  const maxReachedStage = stepsData
    ? Math.max(
        currentStage,
        ...stepsData
          .filter((s: any) => s.completedAt || s.data || s.skipReason)
          .map((s: any) => s.stepNumber)
      )
    : currentStage;

  const getStageStatus = (stageNum: number) => {
    // Use maxReachedStage instead of currentStage to determine completed stages
    if (isStepCompleted(stageNum) || stageNum < maxReachedStage)
      return "completed";
    if (stageNum === currentStage) return "current";
    return "locked";
  };

  // Mutation to navigate to a different stage (all completed stages 1-8)
  const navigateToStageMutation = useMutation({
    mutationFn: async (stage: number) => {
      return apiRequest("PATCH", `/api/projects/${project.id}/stage`, {
        stage,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", project.id],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка навигации",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle stage click
  const handleStageClick = (stageNum: number) => {
    // Can only navigate to completed stages (based on actual step data, not just currentStage)
    const isCompleted = isStepCompleted(stageNum) || stageNum < maxReachedStage;
    if (!isCompleted && stageNum !== currentStage) return;

    // Don't navigate if already on this stage
    if (stageNum === currentStage) return;

    // Show warning dialog for early stages (1-4) when navigating back
    if (stageNum < 5 && stageNum < maxReachedStage) {
      setPendingStageNavigation(stageNum);
      setShowNavigationWarning(true);
      return;
    }

    navigateToStageMutation.mutate(stageNum);
  };

  // Handle confirmed navigation from dialog
  const handleConfirmNavigation = () => {
    if (pendingStageNavigation !== null) {
      navigateToStageMutation.mutate(pendingStageNavigation);
    }
    setShowNavigationWarning(false);
    setPendingStageNavigation(null);
  };

  // Handle cancel navigation from dialog
  const handleCancelNavigation = () => {
    setShowNavigationWarning(false);
    setPendingStageNavigation(null);
  };

  return (
    <div className="w-64 border-r bg-sidebar flex flex-col h-full pointer-events-auto">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            data-testid="button-back-home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {/* Close button for mobile */}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="md:hidden"
              data-testid="button-close-sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
        <h2 className="text-sm font-semibold text-sidebar-foreground/70 mb-1">
          Project Workflow
        </h2>
        <p className="text-xs text-sidebar-foreground/50">
          {project.title || "Untitled"}
        </p>
      </div>

      {/* Stages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {STAGES.map((stage) => {
            const Icon = stage.icon;
            const status = getStageStatus(stage.number);
            const isActive = stage.number === currentStage;
            // Use actual step completion data, not just currentStage comparison
            const isCompleted =
              isStepCompleted(stage.number) || stage.number < maxReachedStage;
            // Only lock stages that haven't been reached yet
            const isLocked = stage.number > maxReachedStage;
            const isSkipped = isStepSkipped(stage.number);

            // All completed stages are navigable (with warning for early stages 1-4)
            const isNavigable = (isCompleted || isActive) && !isActive;

            return (
              <div
                key={stage.number}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-colors",
                  isActive && "bg-sidebar-accent",
                  !isActive && "hover-elevate",
                  isNavigable ? "cursor-pointer" : "cursor-default",
                  isSkipped && "opacity-70"
                )}
                onClick={() => isNavigable && handleStageClick(stage.number)}
                data-testid={`sidebar-stage-${stage.number}`}
              >
                <div className="relative">
                  {isCompleted ? (
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-white",
                        isSkipped ? "bg-muted-foreground" : "bg-chart-2"
                      )}
                    >
                      {isSkipped ? (
                        <FastForward className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </div>
                  ) : isActive ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                      {stage.number}
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-sidebar-border text-sidebar-foreground/50">
                      {isLocked ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isActive
                          ? "text-sidebar-foreground"
                          : "text-sidebar-foreground/70"
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm font-medium truncate",
                        isActive
                          ? "text-sidebar-foreground"
                          : "text-sidebar-foreground/70"
                      )}
                    >
                      {stage.title}
                    </span>
                  </div>
                  {stage.optional && (
                    <span className="text-xs text-sidebar-foreground/50">
                      Optional
                    </span>
                  )}

                  {/* Show source metadata for Stage 1 */}
                  {stage.number === 1 &&
                  project.sourceType &&
                  project.sourceData ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {project.sourceType === "news" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4"
                        >
                          <Radio className="h-2.5 w-2.5 mr-1" />
                          News
                        </Badge>
                      )}
                      {project.sourceType === "instagram" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4"
                        >
                          <Instagram className="h-2.5 w-2.5 mr-1" />
                          Reel
                        </Badge>
                      )}
                      {project.sourceType === "custom" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4"
                        >
                          <FileCode className="h-2.5 w-2.5 mr-1" />
                          Custom
                        </Badge>
                      )}
                      {(project.sourceData as Record<string, any>).language && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4 uppercase"
                        >
                          {(project.sourceData as Record<string, any>).language}
                        </Badge>
                      )}
                      {typeof (project.sourceData as Record<string, any>)
                        .aiScore === "number" && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 h-4"
                        >
                          {(project.sourceData as Record<string, any>).aiScore}
                          /100
                        </Badge>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-4">
        {/* Settings Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => navigate("/settings")}
          data-testid="button-settings"
        >
          <Settings className="h-4 w-4" />
          Настройки
        </Button>

        {/* Progress */}
        <div>
          <div className="text-xs text-sidebar-foreground/50">
            Stage {currentStage} of {STAGES.length}
          </div>
          <div className="mt-2 h-2 bg-sidebar-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(currentStage / STAGES.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Navigation Warning Dialog */}
      <AlertDialog
        open={showNavigationWarning}
        onOpenChange={setShowNavigationWarning}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Внимание!</AlertDialogTitle>
            <AlertDialogDescription>
              Вы возвращаетесь на этап {pendingStageNavigation} (
              {STAGES.find((s) => s.number === pendingStageNavigation)?.title ||
                "Unknown"}
              ). Изменения на ранних этапах могут повлиять на последующие этапы.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelNavigation}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNavigation}>
              Продолжить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
