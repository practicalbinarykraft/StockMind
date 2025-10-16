import { useParams, useLocation } from "wouter"
import { useQuery } from "@tanstack/react-query"
import type { Project, ProjectStep } from "@shared/schema"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Menu } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { ProjectSidebar } from "@/components/project/project-sidebar"
import { StageContent } from "@/components/project/stage-content"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect } from "react"

export default function ProjectWorkflow() {
  const params = useParams()
  const [, setLocation] = useLocation()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  const projectId = params.id
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Close sidebar when window resizes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  })

  const { data: steps } = useQuery<ProjectStep[]>({
    queryKey: ["/api/projects", projectId, "steps"],
    enabled: !!projectId,
    staleTime: 0,  // Force fresh data
    gcTime: 0,     // Clear cache immediately
  })

  if (projectLoading) {
    return (
      <div className="flex h-screen">
        <div className="w-64 border-r bg-sidebar p-6 hidden md:block">
          <Skeleton className="h-6 w-32 mb-8" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Project not found</h2>
          <p className="text-muted-foreground mb-6">
            This project doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background relative">
      {/* Mobile Menu Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsSidebarOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40"
        data-testid="button-mobile-menu"
        aria-label="Open navigation menu"
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Backdrop Overlay (Mobile Only) */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
          data-testid="sidebar-backdrop"
        />
      )}

      {/* Sidebar */}
      <div 
        className={`
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          fixed md:static
          inset-y-0 left-0
          z-50 md:z-auto
          transition-transform duration-300 ease-in-out
          w-64
          pointer-events-none md:pointer-events-auto
        `}
      >
        <ProjectSidebar 
          project={project} 
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <StageContent project={project} steps={steps || []} />
      </div>
    </div>
  )
}
