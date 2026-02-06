/**
 * Карточка сцены
 */

import { useState } from 'react'
import { Card } from '@/shared/ui/card'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { Scene } from '../../types'

interface SceneCardProps {
  scene: Scene
  index: number
}

export function SceneCard({ scene, index }: SceneCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 text-sm font-medium">
              {index + 1}
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-sm font-medium hover:text-cyan-400 transition-colors"
            >
              Сцена {index + 1}
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <p className="text-sm text-slate-300 leading-relaxed">
              {scene.text}
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
