import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'neon'
  className?: string
}

/**
 * Индикатор загрузки с анимацией
 */
export default function LoadingSpinner({
  size = 'md',
  variant = 'default',
  className = '',
}: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }
  
  const colors = {
    default: 'text-primary-500',
    neon: 'text-neon-cyan',
  }
  
  return (
    <Loader2
      className={`${sizes[size]} ${colors[variant]} animate-spin ${className}`}
    />
  )
}

