import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useLocation } from "wouter"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Layout } from "@/components/layout/layout"
import type { Project } from "@shared/schema"
import { queryClient } from "@/shared/api"

import { useProjects, useProjectFilters } from "./hooks"
import {
  ProjectsToolbar,
  ProjectsGrid,
  DeleteDialog,
  RenameDialog,
  PermanentDeleteDialog,
} from "./components"

export default function Home() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [, setLocation] = useLocation()
  const { toast } = useToast()

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [newTitle, setNewTitle] = useState("")

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    toast({
      title: "Unauthorized",
      description: "Redirecting to login...",
      variant: "destructive",
    })
    setTimeout(() => {
      window.location.href = "/login"
    }, 500)
    return null
  }

  // Hooks
  const {
    projects,
    projectsWithScripts,
    isLoading,
    deleteMutation,
    renameMutation,
    restoreMutation,
    permanentDeleteMutation,
  } = useProjects()

  const {
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    filteredProjects,
  } = useProjectFilters({ projects })

  // Background prefetch of HeyGen avatars for faster Stage 5 loading
  useEffect(() => {
    // Only prefetch if authenticated and not already loading
    if (!isAuthenticated || authLoading) return

    // Prefetch avatars in the background (non-blocking)
    // This will populate the cache so Stage 5 loads instantly
    const prefetchAvatars = async () => {
      try {
        console.log('🔄 Background prefetch: HeyGen avatars...')
        await queryClient.prefetchQuery({
          queryKey: ["/api/heygen/avatars", 0], // page 0
          queryFn: async () => {
            const response = await fetch('/api/heygen/avatars?page=0&limit=30', {
              credentials: 'include'
            })
            if (!response.ok) throw new Error('Failed to prefetch avatars')
            return response.json()
          },
          staleTime: 1000 * 60 * 60 * 6, // 6 hours
        })
        console.log('✅ Background prefetch: HeyGen avatars completed')
      } catch (error) {
        // Silent fail - user might not have HeyGen API key yet
        console.log('ℹ️ Background prefetch: HeyGen avatars skipped (no API key or network issue)')
      }
    }

    // Delay prefetch by 2 seconds to not interfere with initial page load
    const timeoutId = setTimeout(prefetchAvatars, 2000)
    
    return () => clearTimeout(timeoutId)
  }, [isAuthenticated, authLoading])

  // Handlers
  const handleDelete = (project: Project) => {
    setSelectedProject(project)
    setDeleteDialogOpen(true)
  }

  const handleRename = (project: Project) => {
    setSelectedProject(project)
    setNewTitle(project.title || "")
    setRenameDialogOpen(true)
  }

  const handleRestore = (project: Project) => {
    restoreMutation.mutate(project.id)
  }

  const handlePermanentDelete = (project: Project) => {
    setSelectedProject(project)
    setPermanentDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (selectedProject) {
      deleteMutation.mutate(selectedProject.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false)
          setSelectedProject(null)
        }
      })
    }
  }

  const confirmPermanentDelete = () => {
    if (selectedProject) {
      permanentDeleteMutation.mutate(selectedProject.id, {
        onSuccess: () => {
          setPermanentDeleteDialogOpen(false)
          setSelectedProject(null)
        }
      })
    }
  }

  const confirmRename = () => {
    if (selectedProject && newTitle.trim()) {
      renameMutation.mutate(
        { projectId: selectedProject.id, title: newTitle.trim() },
        {
          onSuccess: () => {
            setRenameDialogOpen(false)
            setSelectedProject(null)
            setNewTitle("")
          }
        }
      )
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}!
          </h2>
          <p className="text-muted-foreground">
            Create AI-powered videos from news sources and custom scripts.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 flex gap-3 flex-wrap">
          <Button
            size="lg"
            onClick={() => setLocation("/project/new")}
            className="gap-2"
            data-testid="button-new-project"
          >
            <Plus className="h-5 w-5" />
            New Project
          </Button>
        </div>

        {/* Toolbar */}
        <ProjectsToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filter={filter}
          onFilterChange={setFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        {/* Projects Grid */}
        <ProjectsGrid
          projects={filteredProjects}
          projectsWithScripts={projectsWithScripts}
          isLoading={isLoading}
          filter={filter}
          onNavigate={(id) => setLocation(`/project/${id}`)}
          onDelete={handleDelete}
          onRename={handleRename}
          onRestore={handleRestore}
          onPermanentDelete={handlePermanentDelete}
          onCreateProject={() => setLocation("/project/new")}
        />
      </div>

      {/* Dialogs */}
      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        isPending={deleteMutation.isPending}
      />

      <RenameDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        title={newTitle}
        onTitleChange={setNewTitle}
        onConfirm={confirmRename}
        isPending={renameMutation.isPending}
      />

      <PermanentDeleteDialog
        open={permanentDeleteDialogOpen}
        onOpenChange={setPermanentDeleteDialogOpen}
        onConfirm={confirmPermanentDelete}
        isPending={permanentDeleteMutation.isPending}
      />
    </Layout>
  )
}
