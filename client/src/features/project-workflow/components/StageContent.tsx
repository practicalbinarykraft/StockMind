import { CreateScriptScreen } from "../stages/ScriptStage/components/CreateScriptScreen";
import { Stage2ContentInput } from "../stages/ContentStage/ContentStage";
import { Stage3AIAnalysis } from "../stages/ScriptStage/stage-3-ai-analysis";
import { Stage4VoiceGeneration } from "../stages/VoiceStage/Stage4VoiceGeneration";
import { Stage5AvatarSelection } from "../stages/AvatarStage/AvatarStage";
import { Stage6FinalExport } from "../stages/ExportStage/ExportStage";
import { Stage7Storyboard } from "../stages/StoryboardStage/StoryboardStage";
import { Stage8Performance } from "../stages/PerformanceStage/PerformanceStage";
import { useWorkflowStore, selectCurrentStage } from "../store/workflowStore";

/**
 * StageContent - роутер для стейджей
 * Только рендерит нужный stage, без проброски пропсов
 * Все данные stages берут из store через useWorkflowStore
 */
export function StageContent() {
  const currentStage = useWorkflowStore(selectCurrentStage);

  const renderStage = () => {
    switch (currentStage) {
      case 1:
        return <CreateScriptScreen />;
      case 2:
        return <Stage2ContentInput />;
      case 3:
        return <Stage3AIAnalysis />;
      case 4:
        return <Stage4VoiceGeneration />;
      case 5:
        return <Stage5AvatarSelection />;
      case 6:
        return <Stage6FinalExport />;
      case 7:
        return <Stage7Storyboard />;
      case 8:
        return <Stage8Performance />;
      default:
        return <div className="p-8">Unknown stage</div>;
    }
  };

  return <div className="flex-1 overflow-y-auto">{renderStage()}</div>;
}
