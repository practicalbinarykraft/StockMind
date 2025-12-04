import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  MoreVertical,
  Edit,
  Trash2,
  RotateCcw,
  Film,
  Clock,
  Layout,
  Instagram,
  Play,
  ArrowRight,
  FileText,
} from "lucide-react"
import { AnalyticsColumn } from "./analytics-column"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import type { Project } from "@shared/schema"
import { useLocation } from "wouter"
import { useState } from "react"

interface ProjectListItemProps {
  project: any
  onDelete: (project: Project) => void
  onRename: (project: Project) => void
  onRestore: (project: Project) => void
  onPermanentDelete: (project: Project) => void
}

export function ProjectListItem({
  project,
  onDelete,
  onRename,
  onRestore,
  onPermanentDelete,
}: ProjectListItemProps) {
  const [, setLocation] = useLocation()
  const [scriptModalOpen, setScriptModalOpen] = useState(false)
  
  const progress = ((project.currentStage - 1) / 7) * 100
  const getProgressColor = () => {
    if (progress < 25) return "rgb(239 68 68)" // red-500
    if (progress < 75) return "rgb(234 179 8)" // yellow-500
    return "rgb(34 197 94)" // green-500
  }

  // Get script scenes from current script version (primary source)
  // Script is stored in script_versions table, not in step3Data
  const currentVersion = project.currentScriptVersion
  let scenes: any[] = []
  
  if (currentVersion?.scenes) {
    // Script exists in script_versions - this is the primary source
    scenes = currentVersion.scenes
  } else {
    // Fallback: try step3Data (for backward compatibility or if version not loaded)
    const step3 = project.step3Data
    const step3DataContent = step3?.data || step3
    if (step3DataContent?.scenes) {
      scenes = step3DataContent.scenes
    }
  }
  
  // Format script text from scenes
  const scriptText = scenes.length > 0
    ? scenes.slice(0, 3).map((s: any) => {
        // Handle different scene formats
        if (typeof s === 'string') return s
        // Script version scenes have: text, start, end, sceneNumber, etc.
        return s.text || s.content || s
      }).filter(Boolean).join(' ')
    : null
  
  const hasScript = !!scriptText && scriptText.trim().length > 0

  return (
    <Card
      className="overflow-hidden hover-elevate transition-all group"
      data-testid={`list-item-project-${project.id}`}
    >
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
          {/* Left: Script */}
          <div 
            className="p-6 border-r cursor-pointer hover:bg-muted/50 transition-colors flex flex-col h-full"
            onClick={() => setLocation(`/project/${project.id}`)}
          >
            <div className="flex items-start justify-between mb-3 flex-shrink-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  {project.sourceType === 'instagram' && (
                    <Instagram className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  )}
                  <h3 className="font-semibold text-base line-clamp-1">
                    {project.displayTitle || project.title || "Untitled Project"}
                  </h3>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={project.status === "completed" ? "default" : "secondary"} className="text-xs">
                    {project.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Stage {project.currentStage}/8
                  </span>
                  {project.currentStage < 3 && (
                    <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">
                      Next: Stage 3
                    </Badge>
                  )}
                  {project.currentStage === 3 && !hasScript && (
                    <Badge variant="outline" className="text-xs border-blue-500 text-blue-500">
                      Создать сценарий
                    </Badge>
                  )}
                </div>
              </div>
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
            </div>

            {/* Script Preview - Flexible area */}
            <div className="flex-1 flex flex-col min-h-0 mb-3">
              <div className="text-xs font-medium text-muted-foreground mb-1.5">
                Сценарий:
              </div>
              {hasScript ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <p className="text-xs line-clamp-3 text-muted-foreground leading-relaxed flex-shrink-0">
                    {scriptText}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    {scenes.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{scenes.length - 3} сцен
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        setScriptModalOpen(true)
                      }}
                      className="h-6 px-2 text-xs"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Открыть сценарий
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground italic">
                    Сценарий еще не создан
                  </p>
                  {project.currentStage < 3 ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        setLocation(`/project/${project.id}`)
                      }}
                      className="w-full text-xs h-7"
                    >
                      <ArrowRight className="h-3 w-3 mr-1" />
                      Перейти к Stage 3
                    </Button>
                  ) : project.currentStage === 3 ? (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={(e) => {
                        e.stopPropagation()
                        setLocation(`/project/${project.id}`)
                      }}
                      className="w-full text-xs h-7"
                    >
                      Продолжить создание
                    </Button>
                  ) : null}
                </div>
              )}
            </div>

            {/* Progress and Stats - Fixed at bottom */}
            <div className="mt-auto space-y-1.5 flex-shrink-0">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Прогресс</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full transition-all"
                  style={{ 
                    width: `${progress}%`,
                    backgroundColor: getProgressColor()
                  }}
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {project.stats?.scenesCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Layout className="h-3 w-3" />
                    <span>{project.stats.scenesCount}</span>
                  </div>
                )}
                {project.stats?.duration > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{Math.round(project.stats.duration)}s</span>
                  </div>
                )}
                <span className="ml-auto">
                  {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true, locale: ru })}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Video */}
          <div 
            className="relative bg-muted cursor-pointer group/video hover:bg-muted/80 transition-colors h-full border-r"
            onClick={() => setLocation(`/project/${project.id}`)}
          >
            {project.stats?.thumbnailUrl ? (
              <div className="relative h-full w-full">
                <img 
                  src={project.stats.thumbnailUrl} 
                  alt={project.displayTitle || project.title || "Project"}
                  className="w-full h-full object-cover"
                />
                {/* Duration overlay */}
                {project.stats?.duration > 0 && (
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {Math.round(project.stats.duration)}s
                  </div>
                )}
                {/* Play button - always visible but more prominent on hover */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover/video:bg-black/30 transition-all">
                  <div className="bg-black/60 group-hover/video:bg-black/80 rounded-full p-2.5 group-hover/video:p-3.5 transition-all">
                    <Play className="h-6 w-6 group-hover/video:h-8 group-hover/video:w-8 text-white transition-all" fill="currentColor" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-4">
                <Film className="w-12 h-12 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground text-center mb-2">
                  Видео еще не создано
                </p>
                {project.stats?.format && project.stats.format !== "unknown" && (
                  <Badge variant="outline" className="text-xs">
                    {typeof project.stats.format === 'string' 
                      ? project.stats.format 
                      : (project.stats.format as any).formatId || 'unknown'}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Right: Analytics */}
          <AnalyticsColumn projectId={project.id} />
        </div>
      </CardContent>

      {/* Script Modal */}
      <Dialog open={scriptModalOpen} onOpenChange={setScriptModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Полный сценарий: {project.displayTitle || project.title || "Untitled Project"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {scenes.length > 0 ? (
              <div className="space-y-3">
                {scenes.map((scene: any, index: number) => {
                  const sceneText = typeof scene === 'string' ? scene : (scene.text || scene.content || scene)
                  const sceneNumber = scene.sceneNumber || scene.id || (index + 1)
                  const sceneStart = scene.start || scene.startTime
                  const sceneEnd = scene.end || scene.endTime
                  
                  return (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Сцена {sceneNumber}
                          </Badge>
                          {(sceneStart !== undefined || sceneEnd !== undefined) && (
                            <span className="text-xs text-muted-foreground">
                              {sceneStart !== undefined && sceneEnd !== undefined 
                                ? `${sceneStart}s - ${sceneEnd}s`
                                : sceneStart !== undefined 
                                  ? `${sceneStart}s`
                                  : sceneEnd !== undefined
                                    ? `до ${sceneEnd}s`
                                    : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {sceneText}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Сценарий еще не создан</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

