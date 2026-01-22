import React, { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/shared/api"
import { useToast } from "@/hooks/use-toast"
import { isUnauthorizedError } from "@/shared/utils/auth-utils"
import { useAuth } from "@/app/providers/AuthProvider"
import { CreateScriptScreen } from "@/features/project-workflow/stages/ScriptStage/components/CreateScriptScreen"
import { AppLayout } from "@/layouts"
import { useWorkflowStore } from "@/features/project-workflow/store/workflowStore"

export default function NewProject() {
  const { toast } = useToast()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [projectId, setProjectId] = useState<string | null>(null)
  const setWorkflowProject = useWorkflowStore((state) => state.setProject)

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    toast({
      title: "Unauthorized",
      description: "Redirecting to login...",
      variant: "destructive",
    })
    setTimeout(() => {
      window.location.href = "/api/login"
    }, 500)
    return null
  }

  // Create project immediately when component mounts
  const createProjectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/projects", {
        sourceType: "custom", // Default, will be updated when user selects source
        currentStage: 1,  // Start at Stage 1 to show CreateScriptScreen
      })
      const data = await response.json()
      return data
    },
    onSuccess: (data: any) => {
      console.log("Project created with ID:", data.id)
      setProjectId(data.id)
      
      // Set project in workflow store so CreateScriptScreen can access it
      setWorkflowProject(data)
      
      // Update cache
      queryClient.setQueryData(["/api/projects"], (oldProjects: any[] | undefined) => {
        return [...(oldProjects || []), data]
      })
      
      // Update project query cache
      queryClient.setQueryData(["/api/projects", data.id], data)
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        })
        setTimeout(() => {
          window.location.href = "/api/login"
        }, 500)
        return
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  // Create project on mount
  React.useEffect(() => {
    if (isAuthenticated && !projectId && !createProjectMutation.isPending && !createProjectMutation.isError) {
      createProjectMutation.mutate()
    }
  }, [isAuthenticated])

  // Show loading while creating project
  if (!projectId || createProjectMutation.isPending) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">Создание проекта...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Once project is created, show CreateScriptScreen
  // The component uses useStageData() hook to get project from workflowStore

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <CreateScriptScreen />
      </div>
    </AppLayout>
  )
}
