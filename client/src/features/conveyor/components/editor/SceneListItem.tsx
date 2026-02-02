import { Card } from '@/shared/ui/card'
import { cn } from '@/shared/utils'
import type { Scene } from '../../types'

interface SceneListItemProps {
  scene: Scene
  isSelected: boolean
  onClick: () => void
}

export function SceneListItem({ scene, isSelected, onClick }: SceneListItemProps) {
  const truncatedText = scene.text.length > 50 ? `${scene.text.slice(0, 50)}...` : scene.text

  return (
    <Card
      className={cn(
        'p-3 cursor-pointer transition-all hover:bg-accent/50',
        isSelected && 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">Сцена {scene.order}</h4>
        {scene.isGenerating && (
          <span className="text-xs text-muted-foreground">Генерация...</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2">{truncatedText}</p>
    </Card>
  )
}
