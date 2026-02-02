import { Plus } from 'lucide-react'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { SceneListItem } from './SceneListItem'
import type { Scene } from '../../types'

interface SceneListPanelProps {
  scenes: Scene[]
  selectedSceneId: string | null
  onSceneSelect: (sceneId: string) => void
  onAddScene: () => void
}

export function SceneListPanel({
  scenes,
  selectedSceneId,
  onSceneSelect,
  onAddScene,
}: SceneListPanelProps) {
  return (
    <div className="glass rounded-xl p-4 flex flex-col max-h-[calc(100vh-200px)]">
      <div className="mb-4">
        <h3 className="text-lg font-semibold gradient-text flex items-center gap-2">
          <span>✦</span>
          Сцены
        </h3>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-2 pr-2">
          {scenes.map((scene) => (
            <SceneListItem
              key={scene.id}
              scene={scene}
              isSelected={selectedSceneId === scene.id}
              onClick={() => onSceneSelect(scene.id)}
            />
          ))}
        </div>
      </ScrollArea>

      <div className="mt-4 pt-4 border-t border-border/30">
        <button
          onClick={onAddScene}
          className="w-full px-4 py-2 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Добавить сцену
        </button>
      </div>
    </div>
  )
}
