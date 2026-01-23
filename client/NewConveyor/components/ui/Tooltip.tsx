import { ReactNode, useState } from 'react'

interface TooltipProps {
  children: ReactNode
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

/**
 * Подсказка при наведении
 */
export default function Tooltip({
  children,
  content,
  position = 'top',
  delay = 200,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null)
  
  const handleMouseEnter = () => {
    const id = setTimeout(() => {
      setIsVisible(true)
    }, delay)
    setTimeoutId(id)
  }
  
  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    setIsVisible(false)
  }
  
  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }
  
  const arrows = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-dark-800',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-dark-800',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-dark-800',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-dark-800',
  }
  
  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute ${positions[position]} z-50 pointer-events-none animate-fade-in`}
        >
          <div className="glass-strong rounded-lg px-3 py-2 text-sm text-white whitespace-nowrap shadow-lg">
            {content}
            <div
              className={`absolute w-0 h-0 border-4 ${arrows[position]}`}
            />
          </div>
        </div>
      )}
    </div>
  )
}

