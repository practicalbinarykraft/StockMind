/**
 * Карточка сцены
 */

import { Card } from '@/shared/ui/card'
import type { Scene } from '../../types'

interface SceneCardProps {
  scene: Scene
  index: number
}

export function SceneCard({ scene, index }: SceneCardProps) {
  return (
    <Card className="p-3">
      <div className="flex items-start gap-2">
        <span className="text-xs font-medium text-muted-foreground min-w-[2rem]">
          #{index + 1}
        </span>
        <p className="text-sm line-clamp-2">
          {scene.text}
        </p>
      </div>
    </Card>
  )
}
