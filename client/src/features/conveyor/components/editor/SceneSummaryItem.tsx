import { Card } from '@/shared/ui/card'
import type { Scene } from '../../types'

interface SceneSummaryItemProps {
  scene: Scene
}

export function SceneSummaryItem({ scene }: SceneSummaryItemProps) {
  const durationText = scene.durationInFrames 
    ? `${Math.round(scene.durationInFrames / 30)} сек` 
    : 'Не указано'
  
  const truncatedText = scene.text.length > 100 
    ? `${scene.text.slice(0, 100)}...` 
    : scene.text

  return (
    <div className="border-b border-border last:border-0 pb-3 mb-3 last:mb-0 last:pb-0">
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-sm font-semibold">Сцена {scene.order}</h5>
        <span className="text-xs text-muted-foreground">
          Длительность: {durationText}
        </span>
      </div>
      
      <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
        {truncatedText}
      </p>

      {(scene.imagePrompt || scene.visualSource) && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Визуал:</span>{' '}
            {scene.imagePrompt || scene.visualSource}
          </p>
        </div>
      )}
    </div>
  )
}
