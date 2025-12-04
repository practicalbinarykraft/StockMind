import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ProjectCard } from "./ProjectCard"
import { ProjectsEmptyState } from "./ProjectsEmptyState"
import { ProjectListItem } from "@/components/project/project-list-item"
import type { Project } from "@shared/schema"
import type { FilterType, ViewMode, ProjectsWithScriptsData } from "../types"

interface ProjectsGridProps {
  projects: Project[]
  projectsWithScripts: ProjectsWithScriptsData | undefined
  isLoading: boolean
  viewMode: ViewMode
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
  viewMode,
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

  if (viewMode === "list") {
    return (
      <div className="space-y-4">
        {projects.map((project: any) => {
          const steps = projectsWithScripts?.steps?.[project.id] || []
          const step3 = steps.find((s: any) => s.stepNumber === 3)
          const currentVersion = projectsWithScripts?.versions?.[project.id]

          return (
            <ProjectListItem
              key={project.id}
              project={{
                ...project,
                step3Data: step3,
                currentScriptVersion: currentVersion
              }}
              onDelete={onDelete}
              onRename={onRename}
              onRestore={onRestore}
              onPermanentDelete={onPermanentDelete}
            />
          )
        })}
      </div>
    )
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
