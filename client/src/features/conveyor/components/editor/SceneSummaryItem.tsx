import type { Scene } from '../../types'

interface SceneSummaryItemProps {
  scene: Scene
}

export function SceneSummaryItem({ scene }: SceneSummaryItemProps) {
  const durationText = scene.durationInFrames 
    ? `${Math.round(scene.durationInFrames / 30)} сек` 
    : 'Не указано'
  
  const truncatedText = scene.text.length > 80 
    ? `${scene.text.slice(0, 80)}...` 
    : scene.text

  return (
    <div className="border-b border-border/30 last:border-0 pb-2 mb-2 last:mb-0 last:pb-0">
      <div className="flex items-start justify-between mb-1.5">
        <h5 className="text-sm font-semibold text-foreground">Сцена {scene.order}</h5>
        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
          {durationText}
        </span>
      </div>
      
      <p className="text-xs text-muted-foreground mb-1.5 leading-relaxed">
        {truncatedText}
      </p>

      {(scene.imagePrompt || scene.visualSource) && (
        <div className="mt-1.5 pt-1.5 border-t border-border/20">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Визуал:</span>{' '}
            {scene.imagePrompt || scene.visualSource}
          </p>
        </div>
      )}
    </div>
  )
}
