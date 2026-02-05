/**
 * Список сцен
 */

import { SceneCard } from './SceneCard'
import type { Scene } from '../../types'

interface ScenesListProps {
  scenes: Scene[]
}

export function ScenesList({ scenes }: ScenesListProps) {
  if (!scenes || scenes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Нет сцен
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {scenes.map((scene, index) => (
        <SceneCard key={scene.id || index} scene={scene} index={index} />
      ))}
    </div>
  )
}
