import { type Project } from "@shared/schema"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  ArrowLeft,
  FileText,
  Newspaper,
  Sparkles,
  Mic,
  Users,
  Download,
  Film,
  CheckCircle2,
  Circle,
  Lock,
  X,
  Radio,
  Instagram,
  FileCode,
} from "lucide-react"
import { useLocation } from "wouter"

const STAGES = [
  { number: 1, title: "Source Selection", icon: Radio },
  { number: 2, title: "Content Input", icon: Newspaper },
  { number: 3, title: "AI Analysis", icon: Sparkles },
  { number: 4, title: "Voice Generation", icon: Mic },
  { number: 5, title: "Avatar Selection", icon: Users },
  { number: 6, title: "Final Export", icon: Download },
  { number: 7, title: "Storyboard", icon: Film, optional: true },
  { number: 8, title: "Performance Analytics", icon: Instagram, optional: true },
]

interface ProjectSidebarProps {
  project: Project
  onClose?: () => void
}

export function ProjectSidebar({ project, onClose }: ProjectSidebarProps) {
  const [, setLocation] = useLocation()
  
  const currentStage = project.currentStage

  const getStageStatus = (stageNum: number) => {
    if (stageNum < currentStage) return "completed"
    if (stageNum === currentStage) return "current"
    return "locked"
  }

  return (
    <div className="w-64 border-r bg-sidebar flex flex-col h-full pointer-events-auto">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            data-testid="button-back-home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {/* Close button for mobile */}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="md:hidden"
              data-testid="button-close-sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
        <h2 className="text-sm font-semibold text-sidebar-foreground/70 mb-1">
          Project Workflow
        </h2>
        <p className="text-xs text-sidebar-foreground/50">
          {project.title || "Untitled"}
        </p>
      </div>

      {/* Stages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {STAGES.map((stage) => {
            const Icon = stage.icon
            const status = getStageStatus(stage.number)
            const isActive = stage.number === currentStage
            const isCompleted = stage.number < currentStage
            const isLocked = stage.number > currentStage

            return (
              <div
                key={stage.number}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-colors",
                  isActive && "bg-sidebar-accent",
                  !isActive && "hover-elevate cursor-default"
                )}
                data-testid={`sidebar-stage-${stage.number}`}
              >
                <div className="relative">
                  {isCompleted ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-chart-2 text-white">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  ) : isActive ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                      {stage.number}
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-sidebar-border text-sidebar-foreground/50">
                      {isLocked ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Icon className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-sidebar-foreground" : "text-sidebar-foreground/70"
                    )} />
                    <span className={cn(
                      "text-sm font-medium truncate",
                      isActive ? "text-sidebar-foreground" : "text-sidebar-foreground/70"
                    )}>
                      {stage.title}
                    </span>
                  </div>
                  {stage.optional && (
                    <span className="text-xs text-sidebar-foreground/50">Optional</span>
                  )}
                  
                  {/* Show source metadata for Stage 1 */}
                  {stage.number === 1 && project.sourceType && project.sourceData && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {project.sourceType === 'news' && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                          <Radio className="h-2.5 w-2.5 mr-1" />
                          News
                        </Badge>
                      )}
                      {project.sourceType === 'instagram' && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                          <Instagram className="h-2.5 w-2.5 mr-1" />
                          Reel
                        </Badge>
                      )}
                      {project.sourceType === 'custom' && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                          <FileCode className="h-2.5 w-2.5 mr-1" />
                          Custom
                        </Badge>
                      )}
                      {project.sourceData.language && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 uppercase">
                          {project.sourceData.language}
                        </Badge>
                      )}
                      {typeof project.sourceData.aiScore === 'number' && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          {project.sourceData.aiScore}/100
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-sidebar-foreground/50">
          Stage {currentStage} of 7
        </div>
        <div className="mt-2 h-2 bg-sidebar-border rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(currentStage / 7) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
