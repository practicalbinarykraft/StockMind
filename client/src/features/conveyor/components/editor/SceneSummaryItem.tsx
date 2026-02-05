import type { Scene } from '../../types'

interface SceneSummaryItemProps {
  scene: Scene
}

export function SceneSummaryItem({ scene }: SceneSummaryItemProps) {
  const durationText = scene.durationInFrames 
    ? `${Math.round(scene.durationInFrames / 30)} сек` 
    : 'Не указано'

  return (
    <div className="border-b border-border/30 last:border-0 pb-1.5 mb-1.5 last:mb-0 last:pb-0">
      <div className="flex items-center justify-between mb-1">
        <h5 className="text-xs font-semibold text-foreground">Сцена {scene.order}</h5>
        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
          {durationText}
        </span>
      </div>
      
      <p className="text-xs text-muted-foreground leading-relaxed">
        {scene.text}
      </p>
    </div>
  )
}
