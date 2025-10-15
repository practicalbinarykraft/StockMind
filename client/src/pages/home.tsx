import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { 
  Settings,
  Plus,
  FolderOpen,
  Trash2,
} from "lucide-react"
import { useLocation } from "wouter"
import { useQuery } from "@tanstack/react-query"
import type { Project } from "@shared/schema"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/hooks/use-toast"

export default function Home() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [, setLocation] = useLocation()
  const [filter, setFilter] = useState<"all" | "draft" | "completed" | "deleted">("all")
  const { toast } = useToast()

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

  const filteredProjects = projects?.filter(p => {
    if (filter === "all") return p.status !== "deleted"
    return p.status === filter
  }) || []

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
                className="hover-elevate active-elevate-2 cursor-pointer transition-all"
                onClick={() => setLocation(`/project/${project.id}`)}
                data-testid={`card-project-${project.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-1">
                      {project.title || "Untitled Project"}
                    </CardTitle>
                    <Badge variant={project.status === "completed" ? "default" : "secondary"}>
                      {project.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
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
    </div>
  )
}
