/**
 * Список сцен с поддержкой новой системы слоев
 */

import { useCompositionStore, selectSortedScenes } from '../../stores/composition'
import { Card } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Image as ImageIcon, Video as VideoIcon, Type } from 'lucide-react'

export function ScenesList() {
  const scenes = useCompositionStore(selectSortedScenes)
  const currentSceneId = useCompositionStore((state) => state.currentSceneId)
  const setCurrentScene = useCompositionStore((state) => state.setCurrentScene)

  if (!scenes || scenes.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground text-sm">
          Нет сцен для отображения
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-3 pr-2">
      {scenes.map((scene, index) => {
        const isActive = currentSceneId === scene.id
        const hasBackground = !!scene.layers.background?.sourceUrl
        const hasOverlay = !!scene.layers.overlay?.sourceUrl
        const hasText = !!scene.layers.textLayer?.isVisible

        return (
          <Card
            key={scene.id}
            className={`p-4 cursor-pointer transition-all hover:shadow-md ${
              isActive ? 'border-primary shadow-md' : ''
            }`}
            onClick={() => setCurrentScene(scene.id)}
          >
            <div className="space-y-2">
              {/* Номер и текст сцены */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm line-clamp-2">{scene.text}</p>
                </div>
              </div>

              {/* Индикаторы слоев */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {hasBackground && (
                  <div className="flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    <span>BG</span>
                  </div>
                )}
                {hasOverlay && (
                  <div className="flex items-center gap-1">
                    <VideoIcon className="h-3 w-3" />
                    <span>OL</span>
                  </div>
                )}
                {hasText && (
                  <div className="flex items-center gap-1">
                    <Type className="h-3 w-3" />
                    <span>Text</span>
                  </div>
                )}
                {!hasBackground && !hasOverlay && !hasText && (
                  <span className="text-muted-foreground/60">Нет слоев</span>
                )}
              </div>

              {/* Длительность */}
              <div className="text-xs text-muted-foreground">
                Длительность: {Math.floor(scene.durationInFrames / 30)}с
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
