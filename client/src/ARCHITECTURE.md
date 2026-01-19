# Feature-based Architecture

Этот проект использует feature-based архитектуру для организации клиентского кода.

## Структура папок

```
src/
├── app/                    # Application entry point
│   ├── providers/         # App-level providers (Query, Auth, Theme)
│   ├── router.tsx         # Routing configuration
│   ├── App.tsx            # Main App component
│   └── index.tsx          # Entry point
│
├── pages/                 # Page components (route handlers)
│   └── */                 # Each page is a composition of features
│
├── layouts/               # Layout components
│   ├── AppLayout.tsx      # Main application layout
│   └── ProjectLayout.tsx  # Project-specific layout
│
├── features/              # Business features (self-contained)
│   ├── auth/              # Authentication feature
│   ├── projects/          # Projects management
│   ├── project-workflow/  # Project workflow (6 stages)
│   ├── news/              # News feature
│   ├── scripts/           # Scripts library
│   ├── conveyor/          # Automation conveyor
│   ├── settings/          # Application settings
│   └── */
│       ├── components/    # Feature-specific components
│       ├── hooks/         # Feature-specific hooks
│       ├── services/      # API calls and business logic
│       ├── store/         # Feature state (Zustand)
│       ├── types.ts       # Feature types
│       └── index.ts       # Public API
│
├── widgets/               # Reusable UI blocks (no business logic)
│   ├── app-header/        # Application header
│   ├── main-navigation/   # Main navigation
│   └── project-sidebar/   # Project sidebar
│
└── shared/                # Shared utilities (truly generic)
    ├── ui/                # UI components (shadcn/ui)
    ├── hooks/             # Generic hooks
    ├── api/               # HTTP client, Query config
    ├── utils/             # Utility functions
    └── types/             # Shared types
```

## Принципы

### 1. Локальность кода
Каждая фича содержит всё необходимое для работы: компоненты, hooks, store, services, utils, types.

### 2. Односторонние зависимости
```
pages → features → widgets → shared
```

- **pages** могут использовать features, widgets, shared
- **features** могут использовать widgets, shared (НЕ другие features!)
- **widgets** могут использовать только shared
- **shared** не зависит ни от чего

### 3. State Management

- **Серверное состояние**: React Query (`@tanstack/react-query`)
- **Клиентское состояние**: Zustand
- Каждая фича может иметь свой store в `features/*/store/`

### 4. Public API

Каждая фича экспортирует только необходимое через `index.ts`:

```typescript
// features/auth/index.ts
export { LoginForm } from './components/LoginForm'
export { useAuth } from './hooks/useAuth'
export type { User } from './types'
```

## Алиасы импортов

```typescript
import { Button } from '@/shared/ui'
import { useAuth } from '@/features/auth'
import { AppHeader } from '@/widgets/app-header'
import { AppLayout } from '@/layouts'
```

Доступные алиасы:
- `@/app/*` - точка входа приложения
- `@/pages/*` - страницы
- `@/layouts/*` - layouts
- `@/features/*` - бизнес-фичи
- `@/widgets/*` - переиспользуемые UI блоки
- `@/shared/*` - общие утилиты

## Статус миграции

✅ **Этап 1**: Подготовка базовой структуры - **ЗАВЕРШЕН**
  - Созданы папки: app/, layouts/, features/, widgets/, shared/
  - Установлен Zustand для state management
  - Настроены алиасы в tsconfig.json и vite.config.ts

✅ **Этап 2**: Миграция app/ (точка входа) - **ЗАВЕРШЕН**
  - Создан app/providers/QueryProvider.tsx (с apiRequest, queryClient)
  - Создан app/providers/AuthProvider.tsx (с useAuth hook)
  - Создан app/providers/ThemeProvider.tsx (с useTheme hook)
  - Создан app/providers/index.tsx с композицией Providers
  - Создан app/router.tsx с роутингом приложения
  - Создан app/App.tsx как композиция провайдеров и роутера
  - Создан app/index.tsx как публичный API модуля
  - Обновлен main.tsx для использования новой структуры
  - Обновлен hooks/use-auth.ts для использования нового провайдера

⏳ **Следующие этапы**:
  - Миграция shared/ (UI, hooks, utils)
  - Миграция layouts/
  - Миграция features/ (auth → projects → workflow → остальные)
  - Обновление pages/
  - Очистка старого кода

## Дополнительные ресурсы

См. полный план миграции: `.cursor/plans/feature-based_architecture_migration_82de9406.plan.md`
