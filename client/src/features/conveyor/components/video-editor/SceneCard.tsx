/**
 * Карточка сцены
 */

import { Card } from '@/shared/ui/card'
import { Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { Scene } from '../../types'

interface SceneCardProps {
  scene: Scene
  index: number
  onDelete?: (sceneId: string) => void
}

export function SceneCard({ scene, index, onDelete }: SceneCardProps) {
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 text-sm font-medium">
              {index + 1}
            </div>
            <span className="text-sm font-medium">
              Сцена {index + 1}
            </span>
          </div>
          
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(scene.id)
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">
          {scene.text}
        </p>
      </div>
    </Card>
  )
}
