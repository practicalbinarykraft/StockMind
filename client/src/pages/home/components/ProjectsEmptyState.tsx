import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FolderOpen, Plus } from "lucide-react"
import type { FilterType } from "../types"

interface ProjectsEmptyStateProps {
  filter: FilterType
  onCreateProject: () => void
}

export function ProjectsEmptyState({ filter, onCreateProject }: ProjectsEmptyStateProps) {
  return (
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
            onClick={onCreateProject}
            className="gap-2"
            data-testid="button-create-first"
          >
            <Plus className="h-4 w-4" />
            Create Project
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
