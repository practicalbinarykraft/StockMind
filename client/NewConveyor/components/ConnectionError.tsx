import { AlertTriangle, X, RotateCcw, Play } from 'lucide-react'
import { ApiException } from '../utils/api'

interface ConnectionErrorProps {
  error: ApiException
  onRetry?: () => void
  onResume?: () => void
  onDismiss?: () => void
}

/**
 * Компонент для отображения ошибки соединения
 */
export default function ConnectionError({
  error,
  onRetry,
  onResume,
  onDismiss,
}: ConnectionErrorProps) {
  const handleCopyRequestId = () => {
    if (error.requestId) {
      navigator.clipboard.writeText(`Request ID: ${error.requestId}`)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass rounded-xl p-6 glow-border border-red-500/30 max-w-md w-full mx-4 relative">
        {/* Кнопка закрытия */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 p-1 hover:bg-dark-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        )}

        {/* Иконка и заголовок */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-red-500/20">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-white">Ошибка соединения</h3>
        </div>

        {/* Сообщение об ошибке */}
        <p className="text-gray-300 mb-4">{error.message}</p>

        {/* Request ID */}
        {error.requestId && (
          <button
            onClick={handleCopyRequestId}
            className="text-sm text-gray-400 hover:text-primary-400 transition-colors mb-4 block"
          >
            Скопировать Request ID ({error.requestId.substring(0, 8)}...)
          </button>
        )}

        {/* Кнопки действий */}
        <div className="flex gap-3 justify-end">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Повторить
            </button>
          )}
          {onResume && (
            <button
              onClick={onResume}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              Продолжить
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

