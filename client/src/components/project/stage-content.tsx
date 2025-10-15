import { type Project, type ProjectStep } from "@shared/schema"
import { Stage1SourceSelection } from "./stages/stage-1-source-selection"
import { Stage2ContentInput } from "./stages/stage-2-content-input"
import { Stage3AIAnalysis } from "./stages/stage-3-ai-analysis"
import { Stage4VoiceGeneration } from "./stages/stage-4-voice"
import { Stage5AvatarSelection } from "./stages/stage-5-avatar"
import { Stage6FinalExport } from "./stages/stage-6-export"
import { Stage7Storyboard } from "./stages/stage-7-storyboard"

interface StageContentProps {
  project: Project
  steps: ProjectStep[]
}

export function StageContent({ project, steps }: StageContentProps) {
  const getStepData = (stepNumber: number) => {
    return steps.find(s => s.stepNumber === stepNumber)?.data
  }

  const renderStage = () => {
    switch (project.currentStage) {
      case 1:
        return <Stage1SourceSelection project={project} stepData={getStepData(1)} />
      case 2:
        return <Stage2ContentInput project={project} stepData={getStepData(2)} />
      case 3:
        return <Stage3AIAnalysis project={project} stepData={getStepData(3)} />
      case 4:
        return <Stage4VoiceGeneration project={project} stepData={getStepData(4)} />
      case 5:
        return <Stage5AvatarSelection project={project} stepData={getStepData(5)} />
      case 6:
        return <Stage6FinalExport project={project} stepData={getStepData(6)} />
      case 7:
        return <Stage7Storyboard project={project} stepData={getStepData(7)} />
      default:
        return <div className="p-8">Unknown stage</div>
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {renderStage()}
    </div>
  )
}
