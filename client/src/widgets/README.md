# Widgets

Переиспользуемые UI-блоки **БЕЗ бизнес-логики**.

## Принципы

- **Только UI**: Widgets не содержат бизнес-логики, работы с API или сложного state management
- **Композиция**: Widgets могут использовать другие widgets и компоненты из `@/shared/ui`
- **Переиспользуемость**: Widgets могут быть использованы в разных layouts и features
- **Props-driven**: Вся конфигурация через props, без внутреннего состояния

## Структура

```
widgets/
├── app-header/          # Шапка приложения
│   ├── AppHeader.tsx
│   ├── ThemeToggle.tsx
│   └── index.ts
├── main-navigation/     # Основная навигация (sidebar)
│   ├── MainNavigation.tsx
│   └── index.ts
└── project-sidebar/     # Сайдбар проекта с этапами
    ├── ProjectSidebar.tsx
    ├── Timeline.tsx
    └── index.ts
```

## Виджеты

### AppHeader

Шапка приложения с логотипом, кнопками настроек и пользовательским меню.

**Использование:**
```tsx
import { AppHeader } from '@/widgets/app-header'

<AppHeader />
```

**Зависимости:**
- `@/hooks/use-auth` - для получения информации о пользователе
- `@/shared/ui/*` - UI компоненты

### MainNavigation

Основная навигация приложения с разделами News, Scripts, Projects, Settings.

**Использование:**
```tsx
import { MainNavigation } from '@/widgets/main-navigation'

<MainNavigation isOpen={true} />
```

**Props:**
- `isOpen?: boolean` - состояние открытия/закрытия (опционально)

**Зависимости:**
- `@/hooks/use-sidebar` - для управления состоянием sidebar
- `@/shared/ui/*` - UI компоненты
- `@/shared/utils` - утилиты (cn)

### ProjectSidebar

Сайдбар проекта с отображением этапов workflow и прогрессом.

**Использование:**
```tsx
import { ProjectSidebar } from '@/widgets/project-sidebar'

<ProjectSidebar project={project} onClose={() => {}} />
```

**Props:**
- `project: Project` - объект проекта
- `onClose?: () => void` - колбэк для закрытия (опционально, для мобильных устройств)

**Зависимости:**
- `@/lib/query-client` - для API запросов
- `@/hooks/use-toast` - для уведомлений
- `@/shared/ui/*` - UI компоненты
- `@/shared/utils` - утилиты (cn)

### Timeline

UI-компонент для отображения timeline проекта со сценами.

**Использование:**
```tsx
import { Timeline } from '@/widgets/project-sidebar'

<Timeline scenes={scenes} totalDuration={120} />
```

**Props:**
- `scenes: Scene[]` - массив сцен
- `totalDuration?: number` - общая длительность (опционально)

**Зависимости:**
- `@/shared/ui/*` - UI компоненты (Card, Badge)

## Правила использования

### ✅ Можно:
- Использовать компоненты из `@/shared/ui`
- Использовать другие widgets
- Использовать generic hooks из `@/shared/hooks`
- Принимать данные через props
- Иметь локальное UI-состояние (например, открыт/закрыт dropdown)

### ❌ Нельзя:
- Делать прямые API запросы (используйте props для передачи данных)
- Импортировать из `@/features`
- Содержать сложную бизнес-логику
- Работать напрямую с глобальным state (Zustand stores)

## Зависимости

```
widgets/ → shared/ui
         → shared/hooks  
         → shared/utils
```

## Миграция

Эти виджеты были перенесены из:
- `components/layout/app-header.tsx` → `widgets/app-header/`
- `components/navigation/main-navigation.tsx` → `widgets/main-navigation/`
- `components/project/project-sidebar.tsx` → `widgets/project-sidebar/ProjectSidebar.tsx`
- `components/project/timeline.tsx` → `widgets/project-sidebar/Timeline.tsx`
