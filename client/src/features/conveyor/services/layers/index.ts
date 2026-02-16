/**
 * Главный модуль layers service - экспорт всех функций и хуков
 */

// API функции
export * from './api'

// React Query хуки для слоев
export * from './hooks'

// Генерация контента через Kie.ai
export * from './generation'

// Утилиты и optimistic updates
export * from './utils'

// Единый объект для обратной совместимости
import * as api from './api'
import * as hooks from './hooks'
import * as generation from './generation'
import * as utils from './utils'

export const layersService = {
  // API functions
  ...api,
  
  // React Query hooks
  ...hooks,
  
  // Generation
  ...generation,
  
  // Utils
  ...utils,
}
