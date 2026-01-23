import { TextareaHTMLAttributes, forwardRef } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    const baseStyles = 'w-full px-4 py-2.5 bg-dark-700/50 border rounded-lg text-white placeholder-gray-500 focus:outline-none transition-all duration-300 resize-none'
    const borderStyles = error
      ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
      : 'border-dark-600 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
    
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`${baseStyles} ${borderStyles} ${className}`}
          {...props}
        />
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

Textarea.displayName = 'Textarea'

export default Textarea
