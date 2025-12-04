# 🔍 АНАЛИЗ ЛОГИКИ СЧЁТЧИКА "СЕГОДНЯ" И ХРАНЕНИЯ СТАТЕЙ

**Дата проверки:** 2024  
**Статус:** ✅ Проверено, найдена 1 проблема

---

## 🎨 ВИЗУАЛЬНАЯ СХЕМА ЛОГИКИ

```
┌─────────────────────────────────────────────────────────────────┐
│ СТАТЬЯ ОБРАБАТЫВАЕТСЯ ЧЕРЕЗ КОНВЕЙЕР                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │ processItem() запускается            │
        │ (Scout → Scorer → ... → Gate)        │
        └─────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                     │
            ✅ Успешно          ❌ Ошибка
            (без падений)       (упал на этапе)
                    │                     │
                    ▼                     ▼
        ┌─────────────────────┐  ┌─────────────────────┐
        │ result.success = true│  │ result.success = false│
        │                      │  │                      │
        │ itemsProcessedToday++│  │ НЕ увеличивается    │
        │ totalProcessed++     │  │                      │
        └─────────────────────┘  └─────────────────────┘
                    │
                    ▼
        ┌─────────────────────────────────────┐
        │ Gate Decision:                      │
        │ - PASS                              │
        │ - NEEDS_REVIEW                      │
        │ - FAIL                              │
        └─────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐      ┌───────────────┐
│ PASS/REVIEW   │      │ FAIL          │
│               │      │               │
│ delivered=true│      │ delivered=false│
│               │      │               │
│ totalPassed++ │      │ totalFailed++ │
│               │      │               │
│ auto_scripts  │      │ (не создаётся)│
│ (создаётся)   │      │               │
└───────────────┘      └───────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ КАЖДЫЙ ДЕНЬ В 00:00 UTC                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │ resetDailyCounts()                   │
        │                                      │
        │ itemsProcessedToday = 0  ✅ Сброс     │
        │ totalProcessed = ...     ❌ НЕ сброс │
        │ totalPassed = ...         ❌ НЕ сброс │
        │ totalFailed = ...         ❌ НЕ сброс │
        └─────────────────────────────────────┘
```

---

## 📊 ЛОГИКА СЧЁТЧИКА "СЕГОДНЯ 4/10"

### 1. Как считается "4" (текущий счётчик)

**Источник данных:**
- Поле `itemsProcessedToday` в таблице `conveyor_settings`
- Тип: `INTEGER`, по умолчанию `0`

**Когда увеличивается:**

```typescript
// server/cron/conveyor-runner.ts:165-169
if (result.success) {
  processed++;
  await conveyorSettingsStorage.incrementDailyCount(userId);
  await conveyorSettingsStorage.addCost(userId, estimatedCostPerItem);
}
```

**Код увеличения:**
```typescript
// server/storage/conveyor-settings.storage.ts:63-71
async incrementDailyCount(userId: string): Promise<void> {
  await db
    .update(conveyorSettings)
    .set({
      itemsProcessedToday: sql`${conveyorSettings.itemsProcessedToday} + 1`,
      totalProcessed: sql`${conveyorSettings.totalProcessed} + 1`,
    })
    .where(eq(conveyorSettings.userId, userId));
}
```

**✅ ПРАВИЛЬНО:** Счётчик увеличивается **ТОЛЬКО** если `result.success === true`.

**Что означает `result.success === true`:**
- Конвейер завершился **без ошибок** (не упал на каком-то этапе)
- Все агенты отработали корректно
- Gate принял решение (PASS, NEEDS_REVIEW или FAIL)
- Delivery сохранил результат

**Важно:** `success: true` **НЕ означает**, что Gate = PASS! Это означает, что статья **обработана** (может быть и FAIL).

**Логика:**
- Если Gate = FAIL → `result.success = true`, `delivered = false` → счётчик увеличивается ✅
- Если Gate = PASS/REVIEW → `result.success = true`, `delivered = true` → счётчик увеличивается ✅
- Если конвейер упал с ошибкой → `result.success = false` → счётчик **НЕ** увеличивается ✅

---

### 2. Как задаётся "10" (дневной лимит)

**Источник данных:**
- Поле `dailyLimit` в таблице `conveyor_settings`
- Тип: `INTEGER`, по умолчанию `10`
- Можно изменить через настройки конвейера (от 1 до 50)

**Проверка лимита:**
```typescript
// server/cron/conveyor-runner.ts:99-103
if (settings.itemsProcessedToday >= settings.dailyLimit) {
  logger.info(`[Conveyor Runner] User ${userId} daily limit reached`);
  await conveyorLogsStorage.logLimitReached(userId, "daily");
  return;
}
```

**✅ ПРАВИЛЬНО:** Проверка происходит перед обработкой и после каждой статьи.

---

### 3. Когда сбрасывается счётчик

**CRON задача:**
```typescript
// server/cron/conveyor-runner.ts:40-44
cron.schedule("0 0 * * *", async () => {
  logger.info("[Conveyor Runner] Resetting daily counts");
  await conveyorSettingsStorage.resetDailyCounts();
});
```

**Код сброса:**
```typescript
// server/storage/conveyor-settings.storage.ts:82-89
async resetDailyCounts(): Promise<void> {
  await db
    .update(conveyorSettings)
    .set({
      itemsProcessedToday: 0,
      lastResetAt: new Date(),
    });
}
```

**⚠️ ПРОБЛЕМА:** Сброс происходит в **UTC 00:00**, а не в локальном времени пользователя!

**Пример:**
- Пользователь в Москве (UTC+3)
- Сброс происходит в 00:00 UTC = 03:00 МСК
- Если пользователь обработал 5 статей в 02:00 МСК, счётчик сбросится через час

**✅ ЧТО СБРАСЫВАЕТСЯ:**
- `itemsProcessedToday = 0` ✅
- `lastResetAt = NOW()` ✅

**✅ ЧТО НЕ СБРАСЫВАЕТСЯ (правильно):**
- `totalProcessed` - накапливается за всё время ✅
- `totalPassed` - накапливается за всё время ✅
- `totalFailed` - накапливается за всё время ✅
- `totalApproved` - накапливается за всё время ✅
- `totalRejected` - накапливается за всё время ✅

---

## 📦 ГДЕ ХРАНЯТСЯ ВСЕ ОБРАБОТАННЫЕ СТАТЬИ

### Таблица 1: `conveyor_items` (История обработки)

**Что хранит:**
- **ВСЕ** попытки обработки статей через конвейер
- Включая успешные, неудачные и в процессе

**Структура:**
```sql
conveyor_items
├── id: UUID
├── userId: UUID
├── sourceType: 'news' | 'instagram'
├── sourceItemId: UUID  -- Ссылка на rss_items или instagram_items
├── status: 'processing' | 'completed' | 'failed'
├── currentStage: INTEGER (1-9)
├── sourceData: JSONB      -- Данные от Scout
├── scoringData: JSONB     -- Данные от Scorer
├── analysisData: JSONB   -- Данные от Analyst
├── architectureData: JSONB -- Данные от Architect
├── scriptData: JSONB     -- Данные от Writer
├── qcData: JSONB         -- Данные от QC
├── optimizationData: JSONB -- Данные от Optimizer
├── gateData: JSONB       -- Данные от Gate
├── stageHistory: JSONB   -- История прохождения этапов
├── revisionContext: JSONB -- Если это revision
├── parentItemId: UUID    -- Ссылка на оригинальный item (для revision)
├── startedAt: TIMESTAMP
├── completedAt: TIMESTAMP
├── totalProcessingMs: INTEGER
├── totalCost: DECIMAL
├── errorStage: INTEGER   -- На каком этапе упало
├── errorMessage: TEXT
└── retryCount: INTEGER
```

**Особенности:**
- ✅ Хранится **НАВСЕГДА** (не удаляется)
- ✅ Включает **все данные** от каждого агента
- ✅ Можно восстановить **полную историю** обработки
- ✅ Можно посмотреть, **на каком этапе** упало

**Пример запроса:**
```sql
-- Все обработанные статьи пользователя
SELECT * FROM conveyor_items 
WHERE user_id = 'user-uuid' 
ORDER BY started_at DESC;
```

---

### Таблица 2: `auto_scripts` (Готовые сценарии)

**Что хранит:**
- **ТОЛЬКО** успешные сценарии (прошли Gate с решением PASS или NEEDS_REVIEW)
- Не хранит failed сценарии

**Структура:**
```sql
auto_scripts
├── id: UUID
├── userId: UUID
├── conveyorItemId: UUID  -- Ссылка на conveyor_items
├── sourceType: 'news' | 'instagram'
├── sourceItemId: UUID    -- Ссылка на rss_items или instagram_items
├── title: TEXT
├── scenes: JSONB         -- [{id, label, text, start, end}]
├── fullScript: TEXT
├── formatId: TEXT
├── formatName: TEXT
├── estimatedDuration: INTEGER
├── initialScore: INTEGER
├── finalScore: INTEGER
├── hookScore: INTEGER
├── structureScore: INTEGER
├── emotionalScore: INTEGER
├── ctaScore: INTEGER
├── gateDecision: 'PASS' | 'NEEDS_REVIEW' | 'FAIL'
├── gateConfidence: DECIMAL
├── status: 'pending' | 'approved' | 'rejected' | 'revision'
├── revisionCount: INTEGER
├── revisionNotes: TEXT
├── rejectionReason: TEXT
├── rejectionCategory: TEXT
├── createdAt: TIMESTAMP
└── reviewedAt: TIMESTAMP
```

**Особенности:**
- ✅ Хранится **НАВСЕГДА** (не удаляется)
- ✅ Только **успешные** сценарии (PASS/NEEDS_REVIEW)
- ✅ Можно отследить **историю ревизий** (revisionCount)
- ✅ Можно посмотреть **причины отклонений** (rejectionReason)

**Пример запроса:**
```sql
-- Все одобренные сценарии пользователя
SELECT * FROM auto_scripts 
WHERE user_id = 'user-uuid' 
  AND status = 'approved'
ORDER BY created_at DESC;
```

---

### Таблица 3: `rss_items` (Исходные статьи)

**Что хранит:**
- **ВСЕ** RSS статьи, которые были найдены парсером
- Независимо от того, обрабатывались они или нет

**Структура:**
```sql
rss_items
├── id: UUID
├── sourceId: UUID        -- Ссылка на rss_sources
├── userId: UUID
├── title: TEXT
├── content: TEXT
├── fullContent: TEXT     -- Полный текст (после scraping)
├── url: TEXT
├── publishedAt: TIMESTAMP
├── imageUrl: TEXT
├── usedInProject: UUID  -- Если использована в проекте
├── userAction: TEXT     -- 'favorite' | 'dismissed' | null
└── articleAnalysis: JSONB -- AI анализ статьи
```

**Особенности:**
- ✅ Хранится **НАВСЕГДА** (не удаляется)
- ✅ Включает **все статьи** из RSS лент
- ✅ Можно найти **необработанные** статьи
- ✅ Можно посмотреть, **какие использованы** (usedInProject)

**Пример запроса:**
```sql
-- Все необработанные статьи пользователя
SELECT * FROM rss_items 
WHERE user_id = 'user-uuid' 
  AND used_in_project IS NULL
  AND user_action IS NULL
ORDER BY published_at DESC;
```

---

### Таблица 4: `conveyor_settings` (Статистика)

**Что хранит:**
- Общую статистику обработки за **всё время**
- Дневной счётчик (сбрасывается каждый день)

**Структура:**
```sql
conveyor_settings
├── itemsProcessedToday: INTEGER  -- Сбрасывается каждый день
├── totalProcessed: INTEGER       -- НАВСЕГДА (не сбрасывается)
├── totalPassed: INTEGER          -- НАВСЕГДА (не сбрасывается)
├── totalFailed: INTEGER          -- НАВСЕГДА (не сбрасывается)
├── totalApproved: INTEGER        -- НАВСЕГДА (не сбрасывается)
├── totalRejected: INTEGER        -- НАВСЕГДА (не сбрасывается)
├── approvalRate: DECIMAL         -- totalApproved / (totalApproved + totalRejected)
└── lastResetAt: TIMESTAMP        -- Когда последний раз сбрасывался счётчик
```

**Особенности:**
- ✅ `totalProcessed` - **накапливается** за всё время
- ✅ `itemsProcessedToday` - **сбрасывается** каждый день
- ✅ Можно посмотреть **общую статистику** пользователя

---

## 🔄 ПОТОК ДАННЫХ

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. RSS ПАРСЕР находит статью                                     │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │ rss_items             │
        │ - title, content, url  │
        │ - publishedAt         │
        │ - usedInProject: null  │
        └───────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. КОНВЕЙЕР обрабатывает статью                                 │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │ conveyor_items         │
        │ - sourceData          │
        │ - scoringData         │
        │ - analysisData         │
        │ - scriptData          │
        │ - status: 'processing' │
        └───────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │ itemsProcessedToday++  │
        │ totalProcessed++       │
        └───────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │ Gate Decision:         │
        │ - PASS                 │
        │ - NEEDS_REVIEW         │
        │ - FAIL                 │
        └───────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                         │
        ▼                         ▼
┌───────────────┐        ┌───────────────┐
│ PASS/REVIEW   │        │ FAIL          │
└───────────────┘        └───────────────┘
        │                         │
        ▼                         ▼
┌───────────────┐        ┌───────────────┐
│ auto_scripts  │        │ totalFailed++ │
│ (создаётся)   │        │ (статистика)  │
└───────────────┘        └───────────────┘
        │
        ▼
┌───────────────┐
│ totalPassed++  │
└───────────────┘
```

---

## ⚠️ НАЙДЕННЫЕ ПРОБЛЕМЫ

### 🔴 ПРОБЛЕМА 1: Сброс в UTC, а не в локальном времени

**Текущая реализация:**
```typescript
cron.schedule("0 0 * * *", async () => {
  // Сбрасывает в 00:00 UTC
});
```

**Проблема:**
- Для пользователя в Москве (UTC+3) сброс происходит в 03:00 МСК
- Пользователь может обработать статьи в 02:00 МСК, и они "засчитаются" за предыдущий день

**Решение:**
```typescript
// Использовать локальное время пользователя
// Или сбрасывать по часовому поясу из настроек
const userTimezone = settings.timezone || 'UTC';
cron.schedule("0 0 * * *", {
  timezone: userTimezone
}, async () => {
  await conveyorSettingsStorage.resetDailyCounts();
});
```

---

### ✅ НЕ ПРОБЛЕМА: totalProcessed увеличивается правильно

**Текущая реализация:**
```typescript
// conveyor-runner.ts:168
if (result.success) {
  await conveyorSettingsStorage.incrementDailyCount(userId);
  // ↑ Увеличивает И itemsProcessedToday И totalProcessed
}
```

**Логика:**
```
processItem() → проходит все этапы
                ↓
            Gate Decision
                ↓
        ┌───────┴───────┐
        │               │
    PASS/REVIEW      FAIL
        │               │
    delivered: true  delivered: false
        │               │
    result.success    result.success
    = true            = true (но delivered: false)
        │               │
totalProcessed++    totalProcessed++ ✅
itemsProcessedToday++  itemsProcessedToday++ ✅
        │               │
totalPassed++      totalFailed++
```

**✅ ПРАВИЛЬНО:** 
- `processItem()` возвращает `success: true` если конвейер завершился **без ошибок**
- Это означает, что статья **обработана** (не важно, прошла Gate или нет)
- `totalProcessed` считает **все обработанные статьи** (и успешные, и неудачные)
- `totalPassed` и `totalFailed` считают **результат Gate**

**Вывод:** Логика правильная! 
- `totalProcessed` = все обработанные статьи (и успешные, и неудачные)
- `itemsProcessedToday` = все обработанные сегодня (и успешные, и неудачные)
- `totalPassed` = только прошедшие Gate (PASS/NEEDS_REVIEW)
- `totalFailed` = только не прошедшие Gate (FAIL)

**Почему так:**
- Дневной лимит ограничивает **количество обработок**, а не успешных сценариев
- Если статья обработана (даже если Gate = FAIL), она засчитывается в лимит
- Это правильно, потому что обработка тратит ресурсы (AI вызовы, время)

---

### 🟢 НЕ ПРОБЛЕМА: Хранение статей

**✅ Всё правильно:**
- Все статьи хранятся в `rss_items` навсегда
- Все попытки обработки хранятся в `conveyor_items` навсегда
- Успешные сценарии хранятся в `auto_scripts` навсегда
- Ничего не удаляется автоматически

---

## 📊 ИТОГОВАЯ ТАБЛИЦА ХРАНЕНИЯ

| Таблица | Что хранит | Когда создаётся | Когда удаляется |
|---------|-----------|-----------------|-----------------|
| `rss_items` | Все RSS статьи | При парсинге RSS | Никогда (навсегда) |
| `instagram_items` | Все Instagram рилсы | При парсинге Instagram | Никогда (навсегда) |
| `conveyor_items` | Все попытки обработки | При запуске конвейера | Никогда (навсегда) |
| `auto_scripts` | Успешные сценарии | При Gate = PASS/REVIEW | Никогда (навсегда) |
| `conveyor_settings` | Статистика | При создании настроек | Никогда (навсегда) |

**Вывод:** ✅ Все данные хранятся навсегда, ничего не теряется.

---

## ✅ ЧТО РАБОТАЕТ ПРАВИЛЬНО

1. ✅ `itemsProcessedToday` увеличивается только при успешной обработке
2. ✅ Счётчик сбрасывается каждый день (в UTC)
3. ✅ `totalProcessed` накапливается за всё время (не сбрасывается)
4. ✅ Все статьи хранятся в БД навсегда
5. ✅ Можно восстановить полную историю обработки

---

## ⚠️ ЧТО НУЖНО ИСПРАВИТЬ

1. 🔴 **Сброс в UTC** - нужно учитывать часовой пояс пользователя

**Текущая проблема:**
- Сброс происходит в 00:00 UTC для всех пользователей
- Для пользователя в Москве (UTC+3) это 03:00 МСК
- Если пользователь обработал статьи в 02:00 МСК, они "засчитаются" за предыдущий день

**Решение:**
```typescript
// Вариант 1: Использовать часовой пояс из настроек пользователя
const userTimezone = settings.timezone || 'UTC';
cron.schedule("0 0 * * *", {
  timezone: userTimezone
}, async () => {
  await conveyorSettingsStorage.resetDailyCounts();
});

// Вариант 2: Сбрасывать для каждого пользователя индивидуально
// (более сложно, но точнее)
```

---

## 💡 ПРОСТОЕ ОБЪЯСНЕНИЕ

### Как работает счётчик "Сегодня 4/10"?

**"4"** - это количество статей, которые **обработаны** сегодня:
- Каждая обработка (успешная или неудачная) → +1
- Учитываются все статьи, которые прошли через конвейер
- Не важно, прошли они Gate или нет
- Сбрасывается каждый день в полночь (UTC)

**"10"** - это дневной лимит:
- По умолчанию 10 статей в день
- Можно изменить в настройках (1-50)
- Когда достигнут → конвейер останавливается до следующего дня
- Лимит на **обработку**, а не на успешные сценарии

### Где хранятся все статьи?

**Все статьи хранятся в 4 местах:**

1. **`rss_items`** - все исходные статьи (всегда)
2. **`conveyor_items`** - все попытки обработки (всегда)
3. **`auto_scripts`** - успешные сценарии (всегда)
4. **`conveyor_settings`** - статистика (всегда)

**Ничего не удаляется!** Можно посмотреть:
- Какие статьи были обработаны
- Когда они обрабатывались
- Какие прошли, какие упали
- Полную историю за всё время

---

---

## 📋 ИТОГОВАЯ ТАБЛИЦА

| Вопрос | Ответ |
|--------|-------|
| **Как считается "4" в "Сегодня 4/10"?** | Количество статей, обработанных сегодня (успешных и неудачных) |
| **Когда увеличивается счётчик?** | Когда `result.success === true` (конвейер завершился без ошибок) |
| **Учитываются ли FAIL статьи?** | ✅ Да, если конвейер завершился без ошибок |
| **Когда сбрасывается счётчик?** | Каждый день в 00:00 UTC (⚠️ не локальное время!) |
| **Что сбрасывается?** | Только `itemsProcessedToday = 0` |
| **Что НЕ сбрасывается?** | `totalProcessed`, `totalPassed`, `totalFailed` (накапливаются) |
| **Где хранятся все статьи?** | `rss_items` - исходные, `conveyor_items` - обработка, `auto_scripts` - успешные |
| **Удаляются ли статьи?** | ❌ Нет, всё хранится навсегда |
| **Можно ли посмотреть историю?** | ✅ Да, все данные в БД |

---

## ✅ ВЕРДИКТ

**Логика в целом правильная**, но есть **1 проблема**:

1. 🔴 **Сброс в UTC** - нужно учитывать часовой пояс пользователя

**Всё остальное работает правильно:**
- ✅ Счётчик увеличивается только при успешной обработке
- ✅ Учитываются все обработанные статьи (и успешные, и неудачные)
- ✅ Все данные хранятся навсегда
- ✅ Можно восстановить полную историю

---

**Документ готов!** 📚

