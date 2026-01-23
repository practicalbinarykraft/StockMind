import { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  children: ReactNode
}

/**
 * Универсальная кнопка с разными вариантами стилей
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 focus:ring-primary-500 hover-lift',
    secondary: 'bg-dark-700 text-gray-200 hover:bg-dark-600 border border-dark-600 hover:border-primary-500/50 focus:ring-primary-500',
    outline: 'border-2 border-primary-500/50 text-primary-400 hover:bg-primary-500/10 hover:border-primary-500 hover:text-primary-300 focus:ring-primary-500',
    ghost: 'text-gray-400 hover:text-white hover:bg-dark-700/50 focus:ring-primary-500',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 focus:ring-red-500 hover-lift',
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-base gap-2',
    lg: 'px-6 py-3 text-lg gap-2.5',
  }
  
  const combinedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`
  
  return (
    <button
      className={combinedClassName}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Загрузка...</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  )
}

