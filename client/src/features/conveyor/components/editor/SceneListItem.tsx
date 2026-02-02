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
    <div
      className={cn(
        'p-3 rounded-lg cursor-pointer transition-all duration-300',
        'glass border border-border/30',
        'hover:bg-card/70 hover:border-primary/30 hover-lift',
        isSelected && 'glow-border-cyan bg-cyan-500/5'
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className={cn(
          "text-sm font-semibold",
          isSelected ? "text-cyan-400" : "text-foreground"
        )}>
          Сцена {scene.order}
        </h4>
        {scene.isGenerating && (
          <span className="text-xs text-muted-foreground">Генерация...</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2">{truncatedText}</p>
    </div>
  )
}
