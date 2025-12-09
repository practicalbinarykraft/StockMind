import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Project, ProjectStep } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectSidebar } from "@/components/project/project-sidebar";
import { StageContent } from "@/components/project/stage-content";
import { ProjectLayout } from "@/components/layout/project-layout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { ApiError, apiRequest } from "@/lib/query-client";

export default function ProjectWorkflow() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const projectId = params.id;

  // All hooks must be called unconditionally before any early returns
  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useQuery<Project>({
    queryFn: async () => {
      return await apiRequest("GET", `/api/projects/${projectId}`).then((res) =>
        res.json()
      );
    },
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId && !authLoading && isAuthenticated,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Clear cache immediately
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
    // Use cached data if available, but still refetch in background
    placeholderData: (previousData) => previousData,
  });

  // Debug log to see what project data we receive
  useEffect(() => {
    if (project) {
      console.log("[ProjectPage] Project loaded:", {
        id: project.id,
        currentStage: project.currentStage,
        status: project.status,
        sourceType: project.sourceType,
      });
    }
  }, [project]);

  const { data: steps } = useQuery<ProjectStep[]>({
    queryFn: async () => {
      return await apiRequest("GET", `/api/projects/${projectId}/steps`).then(
        (res) => res.json()
      );
    },
    queryKey: ["/api/projects", projectId, "steps"],
    enabled: !!projectId && !authLoading && isAuthenticated,
    staleTime: 0, // Force fresh data
    gcTime: 0, // Clear cache immediately
    refetchOnMount: true,
  });

  // Redirect to login if not authenticated (after all hooks)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Redirecting to login...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [authLoading, isAuthenticated, toast]);

  // Show nothing while redirecting
  if (!authLoading && !isAuthenticated) {
    return null;
  }

  // Handle errors with proper status codes
  if (projectError) {
    const error = projectError as ApiError;
    const status = error.status || 0;

    // 401 - Unauthorized (session expired) - redirect to login
    if (status === 401) {
      const currentPath = window.location.pathname + window.location.search;
      const next = encodeURIComponent(currentPath);
      window.location.href = `/api/login?next=${next}`;
      return null;
    }

    // 403 - Forbidden (project belongs to another user)
    if (status === 403) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold mb-2">Нет доступа к проекту</h2>
            <p className="text-muted-foreground mb-6">
              Этот проект принадлежит другому пользователю.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setLocation("/")} variant="outline">
                <Home className="h-4 w-4 mr-2" />
                На главную
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // 404 - Not Found (project doesn't exist)
    if (status === 404) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold mb-2">Проект не найден</h2>
            <p className="text-muted-foreground mb-6">
              Возможно, он был удалён или ID указан неверно.
            </p>
            <Button onClick={() => setLocation("/")}>
              <Home className="h-4 w-4 mr-2" />
              На главную
            </Button>
          </div>
        </div>
      );
    }

    // Other errors
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-2">Ошибка загрузки</h2>
          <p className="text-muted-foreground mb-6">
            {error.message || "Не удалось загрузить проект"}
          </p>
          <Button onClick={() => setLocation("/")}>
            <Home className="h-4 w-4 mr-2" />
            На главную
          </Button>
        </div>
      </div>
    );
  }

  if (projectLoading) {
    return (
      <ProjectLayout>
        <div className="flex gap-6">
          <div className="w-64 border-r bg-sidebar p-6 hidden lg:block">
            <Skeleton className="h-6 w-32 mb-8" />
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
          <div className="flex-1">
            <Skeleton className="h-10 w-64 mb-6" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </ProjectLayout>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-2">Проект не найден</h2>
          <p className="text-muted-foreground mb-6">
            Не удалось загрузить данные проекта.
          </p>
          <Button onClick={() => setLocation("/")}>
            <Home className="h-4 w-4 mr-2" />
            На главную
          </Button>
        </div>
      </div>
    );
  }

  // Скрываем ProjectSidebar на этапе 1 (Source Selection)
  const showProjectSidebar = project.currentStage > 1;

  return (
    <ProjectLayout>
      <div className="flex gap-6 h-full p-6">
        {/* Project Sidebar - показываем только на этапах 2+ и на больших экранах */}
        {showProjectSidebar && (
          <div className="w-64 border-r bg-sidebar flex-shrink-0 hidden lg:block overflow-y-auto">
            <ProjectSidebar project={project} />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <StageContent project={project} steps={steps || []} />
        </div>
      </div>
    </ProjectLayout>
  );
}
