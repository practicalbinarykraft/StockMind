import { createContext, useContext, useState, ReactNode } from 'react'
import { ApiException } from '../utils/api'
import ConnectionError from '../components/ConnectionError'

interface ErrorContextType {
  showError: (error: ApiException, retry?: () => void) => void
  clearError: () => void
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined)

interface ErrorProviderProps {
  children: ReactNode
}

/**
 * Провайдер для глобального управления ошибками
 */
export function ErrorProvider({ children }: ErrorProviderProps) {
  const [error, setError] = useState<ApiException | null>(null)
  const [retryCallback, setRetryCallback] = useState<(() => void) | null>(null)

  const showError = (err: ApiException, retry?: () => void) => {
    setError(err)
    setRetryCallback(() => retry || null)
  }

  const clearError = () => {
    setError(null)
    setRetryCallback(null)
  }

  const handleRetry = () => {
    if (retryCallback) {
      retryCallback()
    }
    clearError()
  }

  const handleResume = () => {
    clearError()
  }

  return (
    <ErrorContext.Provider value={{ showError, clearError }}>
      {children}
      {error && (
        <ConnectionError
          error={error}
          onRetry={handleRetry}
          onResume={handleResume}
          onDismiss={clearError}
        />
      )}
    </ErrorContext.Provider>
  )
}

/**
 * Хук для использования контекста ошибок
 */
export function useError() {
  const context = useContext(ErrorContext)
  if (context === undefined) {
    throw new Error('useError должен использоваться внутри ErrorProvider')
  }
  return context
}

