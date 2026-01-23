import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

/**
 * Поле ввода с футуристичным дизайном
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', ...props }, ref) => {
    const baseStyles = 'w-full px-4 py-2.5 bg-dark-700/50 border rounded-lg text-white placeholder-gray-500 focus:outline-none transition-all duration-300'
    const borderStyles = error
      ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
      : 'border-dark-600 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
    
    const iconPadding = leftIcon ? 'pl-10' : rightIcon ? 'pr-10' : ''
    
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`${baseStyles} ${borderStyles} ${iconPadding} ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-400">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input

