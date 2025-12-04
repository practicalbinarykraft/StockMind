# StockMind - Полное техническое описание проекта

**Дата документации:** 2 декабря 2025

---

## Обзор

**StockMind** — платформа для автоматической генерации видео-сценариев из новостных RSS-лент с использованием AI (Claude). Проект ориентирован на создателей контента, которые хотят быстро превращать новости в вирусные видео-скрипты.

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React + Vite)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────────┐  │
│  │ News Hub │  │ Scripts  │  │ Projects │  │ Content Factory │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVER (Express + TypeScript)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   REST API   │  │  WebSocket   │  │   Cron Jobs          │   │
│  │   Routes     │  │  (SSE/WS)    │  │   (conveyor-runner)  │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                              │                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    CONVEYOR PIPELINE                       │  │
│  │  Scout → Scorer → Analyst → Architect → Writer → QC → Gate│  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL + Drizzle)               │
│  users, rss_feeds, rss_items, auto_scripts, conveyor_items...   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Технологический стек

### Frontend
- **React 18** + **TypeScript**
- **Vite** — сборка
- **TanStack Query** — кэширование и управление состоянием сервера
- **Tailwind CSS** + **shadcn/ui** — стилизация
- **Wouter** — роутинг
- **Lucide React** — иконки

### Backend
- **Express.js** + **TypeScript**
- **Drizzle ORM** — работа с БД
- **node-cron** — планировщик задач
- **Anthropic SDK** — интеграция с Claude AI
- **ElevenLabs API** — генерация голоса

### База данных
- **PostgreSQL** (Neon serverless)
- **Drizzle Kit** — миграции

---

## Основные модули

### 1. News Hub (`/news`)
Агрегатор новостей из RSS-лент.

**Файлы:**
- `client/src/pages/news/` — страницы новостей
- `server/routes/rss.routes.ts` — API для RSS
- `server/storage/rss.storage.ts` — CRUD для лент

**Функции:**
- Добавление RSS-лент
- Автоматический парсинг новостей
- Перевод и анализ контента
- Избранное

### 2. Scripts Library (`/scripts`)
Библиотека сгенерированных сценариев.

**Файлы:**
- `client/src/pages/scripts/` — UI библиотеки
- `server/routes/scripts.routes.ts` — API
- `server/storage/scripts.storage.ts` — хранение

**Функции:**
- Просмотр всех сценариев
- Фильтрация по статусу/формату
- Экспорт в разные форматы

### 3. Projects (`/projects`)
Ручное создание видео через пошаговый процесс.

**Файлы:**
- `client/src/components/project/` — компоненты этапов
- `client/src/pages/project.tsx` — главная страница проекта

**5 этапов:**
1. **Настройка** — выбор языка, длительности
2. **Контент** — выбор источника (новость/текст)
3. **Сценарий** — генерация и редактирование
4. **Озвучка** — генерация через ElevenLabs или загрузка
5. **Экспорт** — финальный результат

### 4. Content Factory (`/content-factory`) — Главная фича
Автоматический конвейер генерации сценариев.

**Файлы:**
- `client/src/pages/auto-scripts/` — UI ревью сценариев
- `server/conveyor/` — весь конвейер
- `server/cron/conveyor-runner.ts` — планировщик

---

## Conveyor Pipeline (Конвейер)

### Архитектура агентов

```
server/conveyor/
├── agents/
│   ├── base-agent.ts      # Базовый класс
│   ├── scout-agent.ts     # #1 Поиск контента
│   ├── scorer-agent.ts    # #2 Оценка потенциала
│   ├── analyst-agent.ts   # #3 Глубокий анализ
│   ├── architect-agent.ts # #4 Структура сценария
│   ├── writer-agent.ts    # #5 Написание текста
│   ├── qc-agent.ts        # #6 Контроль качества
│   ├── gate-agent.ts      # #7 Финальное решение
│   └── delivery-agent.ts  # #8 Доставка результата
├── conveyor-orchestrator.ts  # Оркестратор
├── conveyor-events.ts        # SSE события
└── types.ts                  # Типы данных
```

### Поток данных

```
RSS Item
    │
    ▼
┌─────────┐  score < 60   ┌──────────┐
│  Scout  │ ────────────▶ │ REJECTED │
└────┬────┘               └──────────┘
     │ score >= 60
     ▼
┌─────────┐
│ Scorer  │ ──▶ Оценка вирусного потенциала (0-100)
└────┬────┘
     ▼
┌──────────┐
│ Analyst  │ ──▶ Ключевые факты, углы подачи, ЦА
└────┬─────┘
     ▼
┌───────────┐
│ Architect │ ──▶ Формат (Hot Take/Explainer/Story)
└────┬──────┘     Структура сцен (hook→context→main→twist→cta)
     ▼
┌────────┐
│ Writer │ ──▶ Текст сценария по сценам
└────┬───┘
     ▼
┌──────┐
│  QC  │ ──▶ Проверка качества, оптимизация
└───┬──┘
    ▼
┌──────┐      approved
│ Gate │ ───────────────▶ auto_scripts (status: pending)
└──────┘      rejected
              ▼
         conveyor_items (status: failed)
```

### Ревизии

Когда пользователь отправляет сценарий на доработку:

1. `auto_scripts.status` → `"revision"`
2. Создается новый `conveyor_item` с `revisionContext`
3. Конвейер запускается с этапа Writer (#5)
4. Writer получает:
   - Текущий сценарий
   - Замечания пользователя
   - Историю предыдущих версий
   - Выбранные сцены для редактирования

**Фикс от 2025-12-02:** Writer теперь делает **точечные правки**, а не переписывает весь сценарий.

---

## Схема базы данных

### Основные таблицы

```sql
-- Пользователи
users (id, username, password, created_at)

-- RSS ленты
rss_feeds (id, user_id, url, title, enabled, ...)

-- Новости из RSS
rss_items (id, feed_id, title, content, full_content, url, ...)

-- Автоматические сценарии
auto_scripts (
  id, user_id, title, format_id, format_name,
  full_script, scenes, -- JSON со сценами
  status, -- 'pending' | 'approved' | 'rejected' | 'revision'
  revision_count,
  conveyor_item_id,
  ...
)

-- Элементы конвейера
conveyor_items (
  id, user_id, status, -- 'processing' | 'completed' | 'failed'
  current_stage,
  source_data, scoring_data, analysis_data,
  architecture_data, script_data, qc_data, gate_data,
  revision_context, -- для ревизий
  parent_item_id,   -- связь с родительским item
  ...
)

-- Настройки конвейера
conveyor_settings (
  user_id, enabled,
  daily_limit, items_processed_today,
  monthly_budget_limit, current_month_cost,
  style_preferences, -- JSON
  ...
)
```

---

## API Endpoints

### Основные роуты

```
/api/auth/*           - Авторизация
/api/rss/*            - RSS ленты и новости
/api/projects/*       - Проекты (ручной режим)
/api/scripts/*        - Библиотека сценариев
/api/auto-scripts/*   - Автоматические сценарии
/api/conveyor/*       - Конвейер
/api/elevenlabs/*     - Голосовая генерация
/api/user-settings/*  - Настройки пользователя
```

### Ключевые эндпоинты Auto-Scripts

```typescript
GET  /api/auto-scripts              // Список сценариев
GET  /api/auto-scripts/:id          // Детали сценария
POST /api/auto-scripts/:id/approve  // Одобрить
POST /api/auto-scripts/:id/reject   // Отклонить
POST /api/auto-scripts/:id/revision // Отправить на ревизию
POST /api/auto-scripts/:id/reset-revision // Сбросить застрявшую ревизию
```

---

## Реалтайм обновления

### Server-Sent Events (SSE)

```typescript
// server/conveyor/conveyor-events.ts
class ConveyorEventEmitter {
  stageStart(userId, itemId, stage, stageName)
  stageComplete(userId, itemId, stage, data)
  stageThinking(userId, itemId, stage, message)
  itemComplete(userId, itemId)
  itemFailed(userId, itemId, error)
}

// Клиент подписывается:
GET /api/conveyor/events
```

### Использование на клиенте

```typescript
// client/src/pages/auto-scripts/hooks/use-revision-progress.ts
useEffect(() => {
  const eventSource = new EventSource('/api/conveyor/events');
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // Обновляем прогресс
  };
}, []);
```

---

## Исправления от 2025-12-02

### 1. UI баг: баннер "Ревизия в процессе"
**Проблема:** Баннер показывался даже после завершения ревизии (100%).

**Причина:** `RevisionStatus` проверял только `auto_scripts.status`, но не `conveyor_items.status`.

**Решение:**
- Добавили проп `progressStatus` в `RevisionStatus`
- Передаем статус из `useRevisionProgress` хука
- Скрываем баннер если `progressStatus === "completed"`

**Файлы:**
- `client/src/pages/auto-scripts/components/RevisionStatus.tsx`
- `client/src/pages/auto-scripts/index.tsx`

### 2. Ревизия переписывает весь сценарий
**Проблема:** Пользователь просил изменить только концовку, а AI переписывал всё.

**Причина:** Промпт говорил "Перепиши сценарий полностью".

**Решение:**
- Переписали `buildRevisionPrompt` в `writer-agent.ts`
- Добавили текущий сценарий в промпт
- Добавили строгие инструкции для точечного редактирования
- Если выбраны конкретные сцены — остальные копируются дословно

**Файл:** `server/conveyor/agents/writer-agent.ts`

---

## Сильные стороны

### 1. Архитектура конвейера
- Модульные агенты с единым интерфейсом
- Легко добавить новый этап
- Каждый агент независим и тестируем

### 2. Типизация
- Полная типизация TypeScript
- Shared types между клиентом и сервером
- Drizzle ORM с типобезопасными запросами

### 3. Реалтайм
- SSE для live-обновлений
- Прогресс-бары на каждом этапе
- Мгновенный фидбек пользователю

### 4. Персонализация
- Style preferences (формальность, тон)
- Custom guidelines
- Обучение на отклонённых сценариях (rejection patterns)

### 5. Лимиты и контроль
- Дневные лимиты обработки
- Месячный бюджет на API
- Автоматический сброс счётчиков (cron)

---

## Слабые места и технический долг

### 1. TypeScript ошибки
Много pre-existing ошибок в клиенте:
```
client/src/components/project/project-sidebar.tsx
client/src/components/project/stages/stage-2/*.tsx
client/src/pages/auto-scripts/index.tsx (status type mismatch)
```

**Рекомендация:** Провести рефакторинг типов, особенно для props компонентов.

### 2. Смешанные паттерны
- Где-то `snake_case`, где-то `camelCase` (наследие)
- `is_candidate` vs `isCandidate` в одном объекте

### 3. Отсутствие тестов
- Нет unit-тестов для агентов
- Нет e2e тестов
- Сложно рефакторить без регрессий

### 4. Магические числа
```typescript
const estimatedCostPerItem = 0.14; // Захардкожено
const stuckTimeout = 60; // минут
```

**Рекомендация:** Вынести в конфиг или env.

### 5. Обработка ошибок
- Некоторые агенты возвращают fallback данные при ошибке парсинга
- Пользователь может получить сценарий с "Parse error"

### 6. SSE соединения
- Нет reconnect логики на клиенте
- При долгом простое соединение может разорваться

### 7. Масштабируемость
- Все агенты выполняются последовательно
- При большой нагрузке один пользователь блокирует остальных
- Нет очереди задач (Redis/Bull)

---

## Конфигурация окружения

```env
DATABASE_URL=postgresql://...
SESSION_SECRET=...
ENCRYPTION_KEY=...           # Для шифрования API ключей пользователей
TELEGRAM_BOT_TOKEN=...       # Опционально
PORT=5000
NODE_ENV=development
CRON_TZ=UTC                  # Таймзона для cron задач
```

---

## Команды разработки

```bash
# Установка
npm install

# Разработка
npm run dev

# Проверка типов
npx tsc --noEmit

# Миграции БД
DATABASE_URL="..." npx drizzle-kit push

# Сборка
npm run build
```

---

## Файловая структура

```
├── client/
│   ├── src/
│   │   ├── components/     # Переиспользуемые компоненты
│   │   ├── hooks/          # Кастомные хуки
│   │   ├── lib/            # Утилиты
│   │   ├── pages/          # Страницы (роуты)
│   │   └── App.tsx         # Корневой компонент
│   └── index.html
├── server/
│   ├── conveyor/           # Конвейер AI
│   │   ├── agents/         # AI агенты
│   │   └── types.ts
│   ├── cron/               # Планировщики
│   ├── routes/             # API эндпоинты
│   ├── storage/            # Data Access Layer
│   ├── lib/                # Утилиты (logger, encryption)
│   ├── db.ts               # Подключение к БД
│   └── index.ts            # Entry point
├── shared/
│   └── schema.ts           # Drizzle схема + типы
├── drizzle.config.ts
├── package.json
└── vite.config.ts
```

---

## Рекомендации для нового разработчика

1. **Начните с** `shared/schema.ts` — поймёте структуру данных
2. **Изучите** `server/conveyor/` — это сердце проекта
3. **Запустите** проект локально и создайте тестовый сценарий
4. **Посмотрите** Network tab — как работают SSE события
5. **Обратите внимание** на `conveyor-orchestrator.ts` — связывает все агенты

---

## Метрики и мониторинг

Текущее состояние можно посмотреть через:
- Логи сервера (`server/lib/logger.ts`)
- Таблица `conveyor_items` — история обработки
- Таблица `conveyor_logs` — детальные логи

---

## Контакты и ресурсы

- **Репозиторий:** локальный (StockMind-main)
- **База данных:** Neon PostgreSQL
- **AI:** Anthropic Claude (claude-sonnet-4-20250514)
- **TTS:** ElevenLabs API
