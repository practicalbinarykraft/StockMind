import { ReactNode, HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  variant?: 'default' | 'glass' | 'glow'
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

/**
 * Универсальная карточка с эффектом стекла
 */
export default function Card({
  children,
  variant = 'default',
  hover = false,
  padding = 'md',
  className = '',
  ...props
}: CardProps) {
  const baseStyles = 'rounded-xl transition-all duration-300'
  
  const variants = {
    default: 'glass',
    glass: 'glass',
    glow: 'glass glow-border',
  }
  
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }
  
  const hoverStyles = hover ? 'hover:bg-dark-800/70 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/20 hover-lift' : ''
  
  const combinedClassName = `${baseStyles} ${variants[variant]} ${paddings[padding]} ${hoverStyles} ${className}`
  
  return (
    <div className={combinedClassName} {...props}>
      {children}
    </div>
  )
}

