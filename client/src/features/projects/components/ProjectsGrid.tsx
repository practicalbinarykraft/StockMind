import { Card, CardContent, CardHeader } from "@/shared/ui/card"
import { Skeleton } from "@/shared/ui/skeleton"
import { ProjectCard } from "./ProjectCard"
import { ProjectsEmptyState } from "./ProjectsEmptyState"
import type { Project } from "@shared/schema"
import { FilterType, ProjectsWithScriptsData } from "../types"

interface ProjectsGridProps {
  projects: Project[]
  projectsWithScripts: ProjectsWithScriptsData | undefined
  isLoading: boolean
  filter: FilterType
  onNavigate: (projectId: string) => void
  onDelete: (project: Project) => void
  onRename: (project: Project) => void
  onRestore: (project: Project) => void
  onPermanentDelete: (project: Project) => void
  onCreateProject: () => void
}

function LoadingSkeleton() {
  return (
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
  )
}

export function ProjectsGrid({
  projects,
  projectsWithScripts,
  isLoading,
  filter,
  onNavigate,
  onDelete,
  onRename,
  onRestore,
  onPermanentDelete,
  onCreateProject,
}: ProjectsGridProps) {
  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (projects.length === 0) {
    return <ProjectsEmptyState filter={filter} onCreateProject={onCreateProject} />
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project: any) => (
        <ProjectCard
          key={project.id}
          project={project}
          onNavigate={onNavigate}
          onDelete={onDelete}
          onRename={onRename}
          onRestore={onRestore}
          onPermanentDelete={onPermanentDelete}
        />
      ))}
    </div>
  )
}
