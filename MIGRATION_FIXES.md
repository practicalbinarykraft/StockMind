# Feature-based Architecture - Исправления

## Выполненные задачи

### 1. ✅ Features/News
**Проблемы:**
- ❌ Отсутствовали компоненты NewsCard и NewsList
- ❌ Сервис не использовался в hooks

**Исправления:**
- ✅ Созданы компоненты `NewsCard.tsx` и `NewsList.tsx` (экспортируемая как NewsListItem)
- ✅ Создан hook `use-news.ts` с функциями `useNews()` и `useNewsFavorites()`
- ✅ Обновлен `use-news-mutations.ts` для использования `newsService`
- ✅ Добавлены utils для news-helpers
- ✅ Обновлен `index.ts` для экспорта всех компонентов, hooks, services и utils

### 2. ✅ Features/Scripts
**Проблемы:**
- ❌ Отсутствовали компоненты
- ❌ Отсутствовали hooks
- ❌ Сервис не использовался

**Исправления:**
- ✅ Созданы компоненты `ScriptCard.tsx` и `ScriptsList.tsx`
- ✅ Создан hook `use-scripts.ts` с функциями:
  - `useScripts(params)` - получение списка скриптов
  - `useScript(id)` - получение одного скрипта
  - `useScriptMutations()` - мутации (delete, analyze)
- ✅ Обновлен `index.ts` для экспорта всех компонентов, hooks, services

### 3. ✅ Features/Conveyor
**Проблемы:**
- ❌ Сервис не использовался в hooks

**Исправления:**
- ✅ Создан hook `use-conveyor.ts` с функциями:
  - `useConveyorDashboard()` - получение данных dashboard
  - `useConveyorItems(limit)` - получение элементов конвейера
  - `useConveyorMutations()` - мутации (trigger, pause, resume)
- ✅ Все функции используют `conveyorService`

### 4. ✅ Features/Instagram
**Проблемы:**
- ❌ Сервис не использовался в hooks

**Исправления:**
- ✅ Обновлен hook `useInstagram.ts`:
  - Разделен на `useInstagramAccounts()` и `useInstagramMedia()`
  - Добавлен `useInstagramMutations()` для delete и sync операций
  - Все функции используют `instagramService`

### 5. ✅ Features/Settings
**Проблемы:**
- ❌ Hooks использовали `apiRequest` напрямую вместо `settingsService`

**Исправления:**
- ✅ Обновлен `use-api-keys.ts` - все мутации используют `settingsService`
- ✅ Обновлен `use-rss-sources.ts` - все мутации используют `settingsService`
- ✅ Обновлен `use-instagram-sources.ts` - add и delete используют `settingsService`
- ⚠️ `checkNowMutation` использует `apiRequest` напрямую (это нормально, т.к. endpoint `/api/instagram/sources/${id}/check-now` не относится к settingsService)

## Архитектура

Все features теперь следуют единой структуре:

```
features/[feature-name]/
├── components/       # UI компоненты
│   ├── Component.tsx
│   └── index.ts
├── hooks/           # React hooks
│   ├── use-[name].ts
│   └── index.ts
├── services/        # API сервисы
│   ├── [name]Service.ts
│   └── index.ts
├── utils/           # Утилиты (опционально)
├── types.ts         # TypeScript типы
└── index.ts         # Главный экспорт
```

## Использование

### Пример использования в страницах:

```typescript
// pages/news/all.tsx
import { useNews, useNewsMutations, NewsListItem } from "@/features/news";

export default function NewsPage() {
  const { articles, isLoading } = useNews({ sort: "date" });
  const { toggleFavoriteMutation } = useNewsMutations();
  
  return (
    <div>
      {articles.map(article => (
        <NewsListItem 
          key={article.id}
          item={article}
          onToggleFavorite={(isFav) => 
            toggleFavoriteMutation.mutate({ id: article.id, isFavorite: isFav })
          }
        />
      ))}
    </div>
  );
}
```

## Важно

- ✅ Все сервисы теперь используются через hooks
- ✅ Компоненты вынесены из stages в features для переиспользования
- ✅ Hooks инкапсулируют бизнес-логику работы с API
- ✅ Страницы теперь могут использовать готовые компоненты и hooks из features

## Следующие шаги

1. Обновить страницы `/pages/news/all.tsx` и `/pages/scripts/all.tsx` для использования новых компонентов из features
2. Обновить страницу `/pages/conveyor/index.tsx` для использования hooks из features/conveyor
3. Протестировать все изменения
4. Удалить дублирующиеся компоненты из старых мест, если они больше не используются
