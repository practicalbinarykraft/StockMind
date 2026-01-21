import React, { useState, useEffect } from "react"
import { useLocation } from "wouter"
import { useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/shared/api"
import { useToast } from "@/hooks/use-toast"
import { isUnauthorizedError } from "@/lib/auth-utils"
import { useAuth } from "@/app/providers/AuthProvider"
import { CreateScriptScreen } from "@/components/project/stages/stage-3/components/CreateScriptScreen"
import { Layout } from "@/components/layout/layout"

export default function NewProject() {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [projectId, setProjectId] = useState<string | null>(null)

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
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">Создание проекта...</p>
          </div>
        </div>
      </Layout>
    )
  }

  // Once project is created, show CreateScriptScreen
  const project = {
    id: projectId,
    sourceType: "custom",
    currentStage: 1,
  } as any

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <CreateScriptScreen
          project={project}
          stepData={null}
          onGenerate={async (data) => {
            // After generation, redirect to project page
            // The generation is handled inside CreateScriptScreen
            // We just need to navigate after it completes
            await queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] })
            await queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "steps"] })
            setLocation(`/project/${projectId}`)
          }}
        />
      </div>
    </Layout>
  )
}
