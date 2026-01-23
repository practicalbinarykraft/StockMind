import type { ScriptScene } from '../../types'
import { Card } from '@/shared/ui/card'

interface SceneCardProps {
  scene: ScriptScene
}

export function SceneCard({ scene }: SceneCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-md font-semibold">Сцена {scene.number}</h5>
        <span className="text-sm text-muted-foreground">Длительность: {scene.duration} сек</span>
      </div>
      
      <div className="mb-3">
        <p className="text-sm leading-relaxed">{scene.text}</p>
      </div>

      {scene.visual && (
        <div className="pt-3 border-t">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Визуал:</span> {scene.visual}
          </p>
        </div>
      )}

      {scene.changes && scene.changes.modified && (
        <div className="mt-3 pt-3 border-t">
          <div className="text-xs">
            {scene.changes.added.length > 0 && (
              <div className="mb-1 text-green-400">
                <span>+</span> {scene.changes.added.join(', ')}
              </div>
            )}
            {scene.changes.removed.length > 0 && (
              <div className="text-red-400">
                <span>-</span> {scene.changes.removed.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
