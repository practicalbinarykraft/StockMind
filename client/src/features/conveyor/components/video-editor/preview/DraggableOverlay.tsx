/**
 * Компонент для drag & drop overlay элементов
 * Использует @dnd-kit для перетаскивания и изменения размера
 */

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Position } from '../../../types/layers'
import { useCompositionStore } from '../../../stores/composition'
import { OverlayTransformBox } from './OverlayTransformBox'

interface DraggableOverlayProps {
  sceneId: string
  position: Position
  aspectLock?: boolean
  minSize?: { width: number; height: number }
  maxSize?: { width: number; height: number }
  contentUrl?: string
  contentType: 'avatar' | 'image' | 'video'
}

export function DraggableOverlay({
  sceneId,
  position,
  aspectLock = true,
  minSize,
  maxSize,
  contentUrl,
  contentType,
}: DraggableOverlayProps) {
  const updateOverlayPosition = useCompositionStore((state) => state.updateOverlayPosition)
  const gridSnapping = useCompositionStore((state) => {
    const scene = state.scenes.get(sceneId)
    return scene?.composition.gridSnapping || false
  })
  const gridSize = useCompositionStore((state) => {
    const scene = state.scenes.get(sceneId)
    return scene?.composition.gridSize || 10
  })

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `overlay-${sceneId}`,
  })

  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.5 : 1,
  }

  const handlePositionChange = (newPosition: Position) => {
    // Применяем grid snapping если включен
    if (gridSnapping) {
      newPosition = {
        x: Math.round(newPosition.x / gridSize) * gridSize,
        y: Math.round(newPosition.y / gridSize) * gridSize,
        width: Math.round(newPosition.width / gridSize) * gridSize,
        height: Math.round(newPosition.height / gridSize) * gridSize,
      }
    }

    // Применяем ограничения min/max размеров
    if (minSize) {
      newPosition.width = Math.max(newPosition.width, minSize.width)
      newPosition.height = Math.max(newPosition.height, minSize.height)
    }

    if (maxSize) {
      newPosition.width = Math.min(newPosition.width, maxSize.width)
      newPosition.height = Math.min(newPosition.height, maxSize.height)
    }

    updateOverlayPosition(sceneId, newPosition)
  }

  const renderContent = () => {
    if (!contentUrl) {
      return (
        <div className="w-full h-full bg-muted border-2 border-dashed border-muted-foreground/50 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Overlay</p>
        </div>
      )
    }

    if (contentType === 'avatar') {
      return (
        <video
          src={contentUrl}
          className="w-full h-full object-contain"
          muted
          loop
          autoPlay
        />
      )
    }

    if (contentType === 'video') {
      return (
        <video
          src={contentUrl}
          className="w-full h-full object-cover"
          muted
          loop
          autoPlay
        />
      )
    }

    return (
      <img
        src={contentUrl}
        alt="Overlay content"
        className="w-full h-full object-cover"
      />
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'absolute',
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: `${position.width}%`,
        height: `${position.height}%`,
        ...style,
      }}
      {...attributes}
      {...listeners}
    >
      <OverlayTransformBox
        position={position}
        aspectLock={aspectLock}
        onPositionChange={handlePositionChange}
      >
        {renderContent()}
      </OverlayTransformBox>
    </div>
  )
}
