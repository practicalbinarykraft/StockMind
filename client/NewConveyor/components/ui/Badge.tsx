import { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'neon'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Бейдж для отображения статусов и меток
 */
export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full'
  
  const variants = {
    default: 'bg-dark-700/50 text-gray-300 border border-dark-600',
    success: 'bg-green-500/20 text-green-400 border border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    error: 'bg-red-500/20 text-red-400 border border-red-500/30',
    info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    neon: 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40 shadow-lg shadow-neon-cyan/20',
  }
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  }
  
  const combinedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`
  
  return (
    <span className={combinedClassName}>
      {children}
    </span>
  )
}

