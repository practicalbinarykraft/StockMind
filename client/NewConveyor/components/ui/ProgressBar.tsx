interface ProgressBarProps {
  value: number
  max?: number
  variant?: 'default' | 'success' | 'warning' | 'error' | 'neon'
  showLabel?: boolean
  label?: string
  className?: string
}

/**
 * Прогресс-бар для отображения прогресса процессов
 */
export default function ProgressBar({
  value,
  max = 100,
  variant = 'default',
  showLabel = false,
  label,
  className = '',
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  
  const variants = {
    default: 'bg-gradient-to-r from-primary-500 to-primary-600',
    success: 'bg-gradient-to-r from-green-500 to-green-600',
    warning: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
    error: 'bg-gradient-to-r from-red-500 to-red-600',
    neon: 'bg-gradient-to-r from-neon-cyan to-neon-blue shadow-lg shadow-neon-cyan/50',
  }
  
  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-300">
            {label || 'Прогресс'}
          </span>
          <span className="text-sm text-gray-400">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="w-full h-2 bg-dark-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${variants[variant]} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

