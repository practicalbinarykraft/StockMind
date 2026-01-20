# Отчет: Миграция layouts/ - Этап 4 ✅

**Дата:** 2026-01-20  
**Статус:** ЗАВЕРШЕНО

## Выполненные задачи

### 1. ✅ Скопированы layout компоненты
- **Источник:** `components/layout/`
- **Назначение:** `layouts/`

**Файлы:**
- `components/layout/app-layout.tsx` → `layouts/AppLayout.tsx`
- `components/layout/project-layout.tsx` → `layouts/ProjectLayout.tsx`

### 2. ✅ Обновлены импорты на shared/

#### AppLayout.tsx
**Было:**
```typescript
import { useSidebar } from "@/hooks/use-sidebar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
```

**Стало:**
```typescript
import { useSidebar } from "@/shared/hooks"
import { Button } from "@/shared/ui"
import { cn } from "@/shared/utils"
```

**Оставлено без изменений (до Этапа 5 - widgets):**
- `import { MainNavigation } from "@/components/navigation/main-navigation"`
- `import { AppHeader } from "@/components/layout/app-header"`

#### ProjectLayout.tsx
**Было:**
```typescript
import { queryClient } from "@/lib/query-client"
```

**Стало:**
```typescript
import { queryClient } from "@/shared/api"
```

**Оставлено без изменений:**
- `import { Header } from "@/components/layout/header"` (до Этапа 5)
- `import { useAuth } from "@/hooks/use-auth"` (до Этапа 6 - features/auth)

### 3. ✅ Создан layouts/index.ts

```typescript
// Layout components
export { AppLayout } from './AppLayout';
export { ProjectLayout } from './ProjectLayout';
```

## Структура layouts/

```
layouts/
├── AppLayout.tsx       ✅ Main application layout
├── ProjectLayout.tsx   ✅ Project-specific layout
└── index.ts            ✅ Exports
```

## Функциональность layouts

### AppLayout
- **Назначение:** Основной layout приложения с sidebar и header
- **Компоненты:**
  - AppHeader (фиксированный header сверху)
  - MainNavigation (боковая навигация)
  - Sidebar с toggle (desktop/mobile адаптив)
  - Mobile menu с overlay
- **Используется в:** Главная страница, настройки, новости, и т.д.

### ProjectLayout
- **Назначение:** Layout для страниц проекта
- **Компоненты:**
  - Header (простой header)
  - Content area для project workflow
- **Особенности:**
  - Prefetch HeyGen avatars в фоне (оптимизация для Stage 5)
  - Более простая структура без sidebar
- **Используется в:** /project/:id

## Зависимости

### От shared/
- ✅ `shared/hooks` (useSidebar)
- ✅ `shared/ui` (Button)
- ✅ `shared/utils` (cn)
- ✅ `shared/api` (queryClient)

### От components/ (временно, до следующих этапов)
- ⏳ `components/layout/app-header` → будет в `widgets/app-header` (Этап 5)
- ⏳ `components/layout/header` → будет в `widgets/` (Этап 5)
- ⏳ `components/navigation/main-navigation` → будет в `widgets/main-navigation` (Этап 5)

### От hooks/ (временно, до Этапа 6)
- ⏳ `hooks/use-auth` → будет в `features/auth/hooks` (Этап 6)

## Использование

### Импорт layouts
```typescript
import { AppLayout, ProjectLayout } from '@/layouts';
```

### Пример использования AppLayout
```typescript
export default function HomePage() {
  return (
    <AppLayout>
      <h1>Welcome</h1>
      {/* page content */}
    </AppLayout>
  );
}
```

### Пример использования ProjectLayout
```typescript
export default function ProjectPage() {
  return (
    <ProjectLayout>
      {/* project workflow stages */}
    </ProjectLayout>
  );
}
```

## Следующие шаги

### Этап 5: Миграция widgets/
- Создать `widgets/app-header/` из `components/layout/app-header.tsx`
- Создать `widgets/main-navigation/` из `components/navigation/main-navigation.tsx`
- Создать `widgets/project-sidebar/` для project layout
- Обновить импорты в layouts на widgets

### После Этапа 5:
Обновить импорты в `AppLayout.tsx` и `ProjectLayout.tsx`:
```typescript
// AppLayout.tsx
import { AppHeader } from "@/widgets/app-header"
import { MainNavigation } from "@/widgets/main-navigation"

// ProjectLayout.tsx  
import { Header } from "@/widgets/header"
```

### После Этапа 6 (features/auth):
Обновить импорт в `ProjectLayout.tsx`:
```typescript
import { useAuth } from "@/features/auth"
```

## Метрики

- **Создано файлов:** 2 (AppLayout.tsx, ProjectLayout.tsx)
- **Обновлено файлов:** 3 (2 layouts + index.ts)
- **Обновлено импортов:** 4 (useSidebar, Button, cn, queryClient)
- **Ошибок компиляции:** 0
- **Ошибок линтера:** 0

## Заключение

✅ **Этап 4 "Миграция layouts/" успешно завершен**

Созданы два основных layout компонента:
- `AppLayout` - для основного приложения с sidebar
- `ProjectLayout` - для страниц проекта

Все импорты обновлены на `shared/` слой. Временные зависимости от `components/` и `hooks/` будут устранены на следующих этапах (widgets и features).

Layouts готовы к использованию в pages и полностью совместимы с текущей структурой приложения.
