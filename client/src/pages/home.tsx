import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { 
  Settings,
  Plus,
  FolderOpen,
  Trash2,
  MoreVertical,
  Edit,
} from "lucide-react"
import { useLocation } from "wouter"
import { useQuery, useMutation } from "@tanstack/react-query"
import type { Project } from "@shared/schema"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiRequest, queryClient } from "@/lib/queryClient"

export default function Home() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [, setLocation] = useLocation()
  const [filter, setFilter] = useState<"all" | "draft" | "completed" | "deleted">("all")
  const { toast } = useToast()
  
  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
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
      window.location.href = "/api/login"
    }, 500)
    return null
  }

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (projectId: string) => {
      return await apiRequest("DELETE", `/api/projects/${projectId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] })
      toast({
        title: "Project Deleted",
        description: "Project has been moved to deleted. Can be restored within 7 days.",
      })
      setDeleteDialogOpen(false)
      setSelectedProject(null)
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete project",
      })
    }
  })

  // Rename mutation
  const renameMutation = useMutation({
    mutationFn: async ({ projectId, title }: { projectId: string, title: string }) => {
      return await apiRequest("PATCH", `/api/projects/${projectId}`, { title })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] })
      toast({
        title: "Project Renamed",
        description: "Project name has been updated successfully.",
      })
      setRenameDialogOpen(false)
      setSelectedProject(null)
      setNewTitle("")
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to rename project",
      })
    }
  })

  const filteredProjects = projects?.filter(p => {
    if (filter === "all") return p.status !== "deleted"
    return p.status === filter
  }) || []

  const handleDelete = (project: Project) => {
    setSelectedProject(project)
    setDeleteDialogOpen(true)
  }

  const handleRename = (project: Project) => {
    setSelectedProject(project)
    setNewTitle(project.title || "")
    setRenameDialogOpen(true)
  }

  const confirmDelete = () => {
    if (selectedProject) {
      deleteMutation.mutate(selectedProject.id)
    }
  }

  const confirmRename = () => {
    if (selectedProject && newTitle.trim()) {
      renameMutation.mutate({ projectId: selectedProject.id, title: newTitle.trim() })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">ReelRepurposer</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/settings")}
              data-testid="button-settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => window.location.href = '/api/logout'}
              data-testid="button-logout"
            >
              Log Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
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
        <div className="mb-8">
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

        {/* Project Filters */}
        <div className="flex gap-2 mb-6">
          {[
            { key: "all", label: "All Projects" },
            { key: "draft", label: "Drafts" },
            { key: "completed", label: "Completed" },
            { key: "deleted", label: "Deleted" },
          ].map((item) => (
            <Button
              key={item.key}
              variant={filter === item.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(item.key as any)}
              data-testid={`button-filter-${item.key}`}
            >
              {item.label}
            </Button>
          ))}
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {filter === "all" 
                  ? "Create your first project to get started"
                  : `No ${filter} projects found`
                }
              </p>
              {filter === "all" && (
                <Button
                  onClick={() => setLocation("/project/new")}
                  className="gap-2"
                  data-testid="button-create-first"
                >
                  <Plus className="h-4 w-4" />
                  Create Project
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="hover-elevate active-elevate-2 transition-all"
                data-testid={`card-project-${project.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => setLocation(`/project/${project.id}`)}
                    >
                      <CardTitle className="text-lg line-clamp-1">
                        {project.title || "Untitled Project"}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={project.status === "completed" ? "default" : "secondary"}>
                        {project.status}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`button-menu-${project.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRename(project)
                            }}
                            data-testid={`menu-rename-${project.id}`}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(project)
                            }}
                            className="text-destructive focus:text-destructive"
                            data-testid={`menu-delete-${project.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent 
                  className="cursor-pointer"
                  onClick={() => setLocation(`/project/${project.id}`)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Source:</span>
                      <span className="font-medium capitalize">{project.sourceType}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Stage:</span>
                      <span className="font-medium">{project.currentStage} / 7</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Updated:</span>
                      <span className="font-medium">
                        {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  
                  {project.status === "deleted" && project.deletedAt && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 text-xs text-destructive">
                        <Trash2 className="h-3 w-3" />
                        Deleted {formatDistanceToNow(new Date(project.deletedAt), { addSuffix: true })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the project to Deleted. You can restore it within 7 days.
              After 7 days, the project will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>
              Enter a new name for your project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-title">Project Name</Label>
              <Input
                id="project-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter project name"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTitle.trim()) {
                    confirmRename()
                  }
                }}
                data-testid="input-rename-project"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
              data-testid="button-cancel-rename"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRename}
              disabled={!newTitle.trim() || renameMutation.isPending}
              data-testid="button-confirm-rename"
            >
              {renameMutation.isPending ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
