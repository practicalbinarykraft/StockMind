import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Film, Clock, Layout, Instagram, MoreVertical, Edit, Trash2, RotateCcw } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import type { EnrichedProject } from "../types"

interface ProjectCardProps {
  project: EnrichedProject
  onNavigate: (projectId: string) => void
  onDelete: (project: EnrichedProject) => void
  onRename: (project: EnrichedProject) => void
  onRestore: (project: EnrichedProject) => void
  onPermanentDelete: (project: EnrichedProject) => void
}

function getProgressColor(progress: number): string {
  if (progress < 25) return "rgb(239 68 68)"  // red-500
  if (progress < 75) return "rgb(234 179 8)"  // yellow-500
  return "rgb(34 197 94)"  // green-500
}

function formatStat(format: any): string | null {
  let formatValue = format
  if (typeof formatValue === 'object' && formatValue !== null) {
    formatValue = formatValue.formatId || formatValue.format || "unknown"
  }
  formatValue = typeof formatValue === 'string' ? formatValue : "unknown"
  return formatValue !== "unknown" ? formatValue : null
}

export function ProjectCard({
  project,
  onNavigate,
  onDelete,
  onRename,
  onRestore,
  onPermanentDelete,
}: ProjectCardProps) {
  const progress = ((project.currentStage - 1) / 7) * 100
  const progressColor = getProgressColor(progress)
  const formatValue = project.stats?.format ? formatStat(project.stats.format) : null

  return (
    <Card
      className="overflow-hidden hover-elevate active-elevate-2 transition-all group"
      data-testid={`card-project-${project.id}`}
    >
      {/* Thumbnail */}
      <div
        className="relative h-40 bg-muted cursor-pointer flex items-center justify-center"
        onClick={() => onNavigate(project.id)}
      >
        {project.stats?.thumbnailUrl ? (
          <img
            src={project.stats.thumbnailUrl}
            alt={project.displayTitle || project.title || "Project"}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Film className="w-16 h-16 text-muted-foreground/30" />
          </div>
        )}

        <div className="absolute top-2 right-2">
          <Badge variant={project.status === "completed" ? "default" : "secondary"}>
            {project.status}
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div
            className="flex-1 cursor-pointer"
            onClick={() => onNavigate(project.id)}
          >
            <CardTitle className="text-base line-clamp-2 flex items-center gap-2">
              {project.sourceType === 'instagram' && (
                <Instagram className="h-4 w-4 text-primary flex-shrink-0" />
              )}
              <span className="line-clamp-2">
                {project.displayTitle || project.title || "Untitled Project"}
              </span>
            </CardTitle>
          </div>
          <ProjectMenu
            project={project}
            onDelete={onDelete}
            onRename={onRename}
            onRestore={onRestore}
            onPermanentDelete={onPermanentDelete}
          />
        </div>
      </CardHeader>

      <CardContent
        className="pt-0 pb-4 cursor-pointer space-y-3"
        onClick={() => onNavigate(project.id)}
      >
        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Stage {project.currentStage}/8</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full transition-all"
              style={{ width: `${progress}%`, backgroundColor: progressColor }}
            />
          </div>
        </div>

        {/* Stats */}
        {project.stats && (project.stats.scenesCount > 0 || project.stats.duration > 0) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {project.stats.scenesCount > 0 && (
              <div className="flex items-center gap-1">
                <Layout className="h-3 w-3" />
                <span>{project.stats.scenesCount} scenes</span>
              </div>
            )}
            {project.stats.duration > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{Math.round(project.stats.duration)}s</span>
              </div>
            )}
            {formatValue && (
              <div className="flex items-center gap-1">
                <Film className="h-3 w-3" />
                <span className="capitalize">{formatValue}</span>
              </div>
            )}
          </div>
        )}

        {/* Updated Time */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Updated:</span>
          <span>{formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true, locale: ru })}</span>
        </div>

        {project.status === "deleted" && project.deletedAt && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 text-xs text-destructive">
              <Trash2 className="h-3 w-3" />
              Deleted {formatDistanceToNow(new Date(project.deletedAt), { addSuffix: true, locale: ru })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface ProjectMenuProps {
  project: EnrichedProject
  onDelete: (project: EnrichedProject) => void
  onRename: (project: EnrichedProject) => void
  onRestore: (project: EnrichedProject) => void
  onPermanentDelete: (project: EnrichedProject) => void
}

function ProjectMenu({ project, onDelete, onRename, onRestore, onPermanentDelete }: ProjectMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 -mt-1"
          onClick={(e) => e.stopPropagation()}
          data-testid={`button-menu-${project.id}`}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {project.status === 'deleted' ? (
          <>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onRestore(project)
              }}
              data-testid={`menu-restore-${project.id}`}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restore
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onPermanentDelete(project)
              }}
              className="text-destructive focus:text-destructive"
              data-testid={`menu-delete-permanent-${project.id}`}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Permanently
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onRename(project)
              }}
              data-testid={`menu-rename-${project.id}`}
            >
              <Edit className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onDelete(project)
              }}
              className="text-destructive focus:text-destructive"
              data-testid={`menu-delete-${project.id}`}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
