import { Plus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
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
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-cyan-400">✦</span>
          Сцены
        </h3>
      </div>

      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-3">
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

      <div className="mt-4 pt-4 border-t border-border">
        <Button
          variant="outline"
          className="w-full"
          onClick={onAddScene}
        >
          <Plus className="h-4 w-4 mr-2" />
          Добавить сцену
        </Button>
      </div>
    </div>
  )
}
