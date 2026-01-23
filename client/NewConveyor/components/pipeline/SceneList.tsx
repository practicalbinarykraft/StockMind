import { Plus } from 'lucide-react'
import Button from '../ui/Button'
import { SceneCard } from './SceneCard'
import { usePipelineStore } from '../../lib/store/pipeline-store'
import { createDefaultScene } from '../../lib/store/pipeline-store'

export function SceneList() {
  const scenes = usePipelineStore((state) => state.scenes)
  const addScene = usePipelineStore((state) => state.addScene)

  const handleAddScene = () => {
    const newScene = createDefaultScene(scenes.length + 1)
    addScene(newScene)
  }

  return (
    <div className="flex flex-col gap-2 sm:gap-4 p-2 sm:p-4 h-full min-h-0">
      <h2 className="text-lg sm:text-xl font-bold text-white flex-shrink-0">
        Сцены
      </h2>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 sm:pr-4 space-y-2 sm:space-y-3">
        {scenes.length === 0 ? (
          <div className="glass rounded-lg p-8 text-center">
            <p className="text-sm text-gray-400">
              Нет сцен. Добавьте первую сцену.
            </p>
          </div>
        ) : (
          scenes.map((scene, index) => (
            <SceneCard key={scene.id} scene={scene} index={index} />
          ))
        )}
      </div>

      <Button
        onClick={handleAddScene}
        variant="primary"
        size="md"
        className="w-full flex-shrink-0"
        leftIcon={<Plus className="h-4 w-4" />}
      >
        Добавить сцену
      </Button>
    </div>
  )
}
