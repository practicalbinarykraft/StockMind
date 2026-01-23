/**
 * Пример использования API утилиты с обработкой ошибок
 * 
 * Этот файл показывает, как использовать систему обработки ошибок
 * в ваших компонентах при выполнении API запросов.
 */

import { get, post, ApiException, isConnectionError } from './api'
import { useError } from '../contexts/ErrorContext'

/**
 * Пример функции для загрузки данных с обработкой ошибок
 */
export async function fetchNewsExample() {
  try {
    // Используем утилиту get для выполнения запроса
    const news = await get('/api/news')
    return news
  } catch (error) {
    // Проверяем, является ли ошибка ошибкой соединения
    if (isConnectionError(error)) {
      // Выбрасываем ошибку дальше, чтобы её обработал ErrorProvider
      throw error
    }
    // Обрабатываем другие типы ошибок
    console.error('Ошибка загрузки новостей:', error)
    throw error
  }
}

/**
 * Пример использования в React компоненте
 */
export function useApiExample() {
  const { showError } = useError()

  const loadData = async () => {
    try {
      const data = await get('/api/data')
      return data
    } catch (error) {
      if (error instanceof ApiException) {
        // Показываем ошибку пользователю через контекст
        showError(error, () => {
          // Функция для повтора запроса
          loadData()
        })
      }
    }
  }

  return { loadData }
}

/**
 * Пример сохранения данных с обработкой ошибок
 */
export async function saveScriptExample(scriptData: unknown) {
  try {
    const savedScript = await post('/api/scripts', scriptData)
    return savedScript
  } catch (error) {
    if (isConnectionError(error)) {
      throw error
    }
    console.error('Ошибка сохранения сценария:', error)
    throw error
  }
}

