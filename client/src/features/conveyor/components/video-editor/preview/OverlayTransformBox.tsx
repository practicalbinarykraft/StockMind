/**
 * Компонент для отображения границ overlay элемента и изменения размера
 * Поддерживает resize через угловые handle и aspect lock
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Position } from '../../../types/layers'

interface OverlayTransformBoxProps {
  position: Position
  aspectLock?: boolean
  onPositionChange: (position: Position) => void
  children: React.ReactNode
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se'

export function OverlayTransformBox({
  position,
  aspectLock = true,
  onPositionChange,
  children,
}: OverlayTransformBoxProps) {
  const [isResizing, setIsResizing] = useState(false)
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const startPosRef = useRef({ x: 0, y: 0, width: 0, height: 0 })

  const handleResizeStart = useCallback(
    (handle: ResizeHandle, e: React.MouseEvent) => {
      e.stopPropagation()
      setIsResizing(true)
      setActiveHandle(handle)
      startPosRef.current = { ...position }
    },
    [position]
  )

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !activeHandle || !containerRef.current) return

      const container = containerRef.current.parentElement
      if (!container) return

      const rect = container.getBoundingClientRect()
      const deltaX = ((e.clientX - rect.left) / rect.width) * 100 - startPosRef.current.x
      const deltaY = ((e.clientY - rect.top) / rect.height) * 100 - startPosRef.current.y

      let newPosition = { ...startPosRef.current }

      switch (activeHandle) {
        case 'nw':
          newPosition.x = startPosRef.current.x + deltaX
          newPosition.y = startPosRef.current.y + deltaY
          newPosition.width = startPosRef.current.width - deltaX
          newPosition.height = startPosRef.current.height - deltaY
          break
        case 'ne':
          newPosition.y = startPosRef.current.y + deltaY
          newPosition.width = startPosRef.current.width + deltaX
          newPosition.height = startPosRef.current.height - deltaY
          break
        case 'sw':
          newPosition.x = startPosRef.current.x + deltaX
          newPosition.width = startPosRef.current.width - deltaX
          newPosition.height = startPosRef.current.height + deltaY
          break
        case 'se':
          newPosition.width = startPosRef.current.width + deltaX
          newPosition.height = startPosRef.current.height + deltaY
          break
      }

      // Применяем aspect lock если включен
      if (aspectLock) {
        const aspectRatio = startPosRef.current.width / startPosRef.current.height
        newPosition.height = newPosition.width / aspectRatio
      }

      // Ограничиваем минимальные размеры
      newPosition.width = Math.max(newPosition.width, 5)
      newPosition.height = Math.max(newPosition.height, 5)

      // Ограничиваем максимальные размеры (не выходить за границы canvas)
      newPosition.width = Math.min(newPosition.width, 100 - newPosition.x)
      newPosition.height = Math.min(newPosition.height, 100 - newPosition.y)

      onPositionChange(newPosition)
    },
    [isResizing, activeHandle, aspectLock, onPositionChange]
  )

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false)
    setActiveHandle(null)
  }, [])

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove)
      window.addEventListener('mouseup', handleResizeEnd)

      return () => {
        window.removeEventListener('mousemove', handleResizeMove)
        window.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [isResizing, handleResizeMove, handleResizeEnd])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full border-2 border-primary"
      style={{
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Контент */}
      <div className="w-full h-full overflow-hidden">{children}</div>

      {/* Угловые handle для resize */}
      <div
        className="absolute -top-2 -left-2 w-4 h-4 bg-primary rounded-full cursor-nw-resize hover:scale-125 transition-transform"
        onMouseDown={(e) => handleResizeStart('nw', e)}
      />
      <div
        className="absolute -top-2 -right-2 w-4 h-4 bg-primary rounded-full cursor-ne-resize hover:scale-125 transition-transform"
        onMouseDown={(e) => handleResizeStart('ne', e)}
      />
      <div
        className="absolute -bottom-2 -left-2 w-4 h-4 bg-primary rounded-full cursor-sw-resize hover:scale-125 transition-transform"
        onMouseDown={(e) => handleResizeStart('sw', e)}
      />
      <div
        className="absolute -bottom-2 -right-2 w-4 h-4 bg-primary rounded-full cursor-se-resize hover:scale-125 transition-transform"
        onMouseDown={(e) => handleResizeStart('se', e)}
      />

      {/* Центральный индикатор для перемещения */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center cursor-move">
        <div className="w-2 h-2 bg-primary rounded-full" />
      </div>
    </div>
  )
}
