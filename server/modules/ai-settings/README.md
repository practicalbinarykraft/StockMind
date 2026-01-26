# AI Settings Module

Модуль для управления настройками AI генерации скриптов.

## Текущая реализация

На данный момент модуль возвращает временные настройки с информацией о API ключах пользователя.

### Эндпоинты

- `GET /api/ai-settings` - Получить настройки AI
- `PUT /api/ai-settings` - Обновить настройки AI (временно не сохраняется в БД)

### Структура ответа

```typescript
{
  provider: 'anthropic' | 'deepseek',
  anthropicApiKeyLast4: string | null,
  deepseekApiKeyLast4: string | null,
  hasAnthropicKey: boolean,
  hasDeepseekKey: boolean,
  scriptwriterPrompt: string,
  editorPrompt: string,
  maxIterations: number,
  autoSendToHumanReview: boolean,
  examples: UploadedExample[]
}
```

## TODO: Постоянное хранение в БД

### 1. Создать таблицу в БД

Добавить в `shared/schema/`:

```typescript
export const aiGenerationSettings = pgTable("ai_generation_settings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").$type<'anthropic' | 'deepseek'>().notNull().default('anthropic'),
  scriptwriterPrompt: text("scriptwriter_prompt").default(''),
  editorPrompt: text("editor_prompt").default(''),
  maxIterations: integer("max_iterations").notNull().default(3),
  autoSendToHumanReview: boolean("auto_send_to_human_review").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### 2. Создать таблицу для примеров

```typescript
export const scriptExamples = pgTable("script_examples", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  content: text("content").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});
```

### 3. Создать миграцию

```bash
npm run db:generate
npm run db:push
```

### 4. Обновить репозиторий

Создать `ai-settings.repo.ts` с методами:
- `getByUserId(userId: string)`
- `create(userId: string, data?: Partial<Settings>)`
- `update(userId: string, data: Partial<Settings>)`
- `addExample(userId: string, filename: string, content: string)`
- `deleteExample(exampleId: string)`
- `getExamples(userId: string)`

### 5. Обновить сервис

Обновить `ai-settings.service.ts` для работы с репозиторием вместо временных данных.

### 6. Добавить эндпоинты для примеров

- `POST /api/ai-settings/examples` - Загрузить пример
- `DELETE /api/ai-settings/examples/:id` - Удалить пример
- `GET /api/ai-settings/examples` - Получить список примеров

## Использование

```typescript
// На клиенте
const { data: settings } = useAISettings();

// Обновить настройки
updateSettings.mutate({
  provider: 'anthropic',
  maxIterations: 5,
  scriptwriterPrompt: 'Custom prompt...'
});
```

## Связанные модули

- `api-keys` - Управление API ключами для LLM провайдеров
- `auto-scripts` - Автоматическая генерация скриптов
- `conveyor` - Конвейер обработки контента
