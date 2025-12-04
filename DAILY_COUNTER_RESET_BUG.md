# 🐛 АНАЛИЗ ПРОБЛЕМЫ СБРОСА СЧЁТЧИКА "СЕГОДНЯ"

**Дата проверки:** 2024  
**Статус:** ❌ Найдена проблема

---

## 🔍 ПРОБЛЕМА

**Вопрос пользователя:** "Почему счётчик сегодня не обнулился? ещё время не пришло что ли?"

**Текущее состояние:**
- Счётчик показывает "4/10" (4 обработанных из 10)
- Сброс должен происходить каждый день в 00:00 UTC
- Но счётчик не обнулился

---

## 📊 ТЕКУЩАЯ РЕАЛИЗАЦИЯ

### Код сброса:

```typescript
// server/cron/conveyor-runner.ts:40-44
cron.schedule("0 0 * * *", async () => {
  logger.info("[Conveyor Runner] Resetting daily counts");
  await conveyorSettingsStorage.resetDailyCounts();
});
```

**Проблема:** ❌ Нет указания timezone!

### Сравнение с другими CRON задачами:

**Instagram Monitor:**
```typescript
cron.schedule('0 * * * *', async () => {
  // ...
}, {
  timezone: process.env.CRON_TZ || 'UTC'  // ✅ Есть timezone!
});
```

**RSS Monitor:**
```typescript
cron.schedule('0 * * * *', async () => {
  // ...
}, {
  timezone: process.env.CRON_TZ || 'UTC'  // ✅ Есть timezone!
});
```

**Conveyor Runner:**
```typescript
cron.schedule("0 0 * * *", async () => {
  // ...
});  // ❌ НЕТ timezone!
```

---

## ⚠️ НАЙДЕННЫЕ ПРОБЛЕМЫ

### Проблема 1: Нет указания timezone

**Текущий код:**
```typescript
cron.schedule("0 0 * * *", async () => {
  // Сброс в 00:00 по времени сервера (не UTC!)
});
```

**Проблема:**
- Если сервер работает в другом часовом поясе (например, WITA UTC+8), сброс происходит в 00:00 WITA
- Это не соответствует ожиданиям (должно быть 00:00 UTC)
- Несогласованность с другими CRON задачами

---

### Проблема 2: Нет логирования времени сброса

**Текущий код:**
```typescript
logger.info("[Conveyor Runner] Resetting daily counts");
// ❌ Не логирует, КОГДА именно произошёл сброс
```

**Проблема:**
- Невозможно проверить, когда последний раз был сброс
- Невозможно диагностировать проблемы

---

### Проблема 3: Нет проверки, что сброс произошёл

**Текущий код:**
```typescript
async resetDailyCounts(): Promise<void> {
  await db
    .update(conveyorSettings)
    .set({
      itemsProcessedToday: 0,
      lastResetAt: new Date(),
    });
  // ❌ Нет проверки, сколько записей обновлено
  // ❌ Нет обработки ошибок
}
```

**Проблема:**
- Если обновление не сработало, никто не узнает
- Нет валидации результата

---

## 🔧 РЕШЕНИЕ

### Исправление 1: Добавить timezone

```typescript
// server/cron/conveyor-runner.ts
cron.schedule("0 0 * * *", async () => {
  logger.info("[Conveyor Runner] Resetting daily counts", {
    timezone: process.env.CRON_TZ || 'UTC',
    resetTime: new Date().toISOString(),
  });
  await conveyorSettingsStorage.resetDailyCounts();
}, {
  timezone: process.env.CRON_TZ || 'UTC'  // ✅ Добавить timezone!
});
```

---

### Исправление 2: Улучшить логирование

```typescript
async resetDailyCounts(): Promise<void> {
  const result = await db
    .update(conveyorSettings)
    .set({
      itemsProcessedToday: 0,
      lastResetAt: new Date(),
    })
    .returning({ id: conveyorSettings.id });
  
  logger.info("[Conveyor Settings] Daily counts reset", {
    resetCount: result.length,
    resetTime: new Date().toISOString(),
  });
}
```

---

### Исправление 3: Добавить проверку результата

```typescript
async resetDailyCounts(): Promise<void> {
  const resetTime = new Date();
  const result = await db
    .update(conveyorSettings)
    .set({
      itemsProcessedToday: 0,
      lastResetAt: resetTime,
    })
    .returning({ id: conveyorSettings.id });
  
  if (result.length === 0) {
    logger.warn("[Conveyor Settings] No settings found to reset");
    return;
  }
  
  logger.info("[Conveyor Settings] Daily counts reset", {
    resetCount: result.length,
    resetTime: resetTime.toISOString(),
  });
}
```

---

## 📊 ТЕКУЩЕЕ ВРЕМЯ И РАСЧЁТ

**Текущее время:**
- UTC: Mon Dec 1 04:53:12 UTC 2025
- WITA: Mon Dec 1 12:53:12 WITA 2025

**Когда должен был произойти сброс:**
- Последний сброс: 1 декабря 2025, 00:00 UTC
- Следующий сброс: 2 декабря 2025, 00:00 UTC

**Проблема:**
- Если сервер работает в WITA (UTC+8), сброс происходит в 00:00 WITA = 16:00 UTC предыдущего дня
- Это означает, что сброс происходит в неправильное время!

---

## ✅ ИСПРАВЛЕНИЯ

### 1. Добавить timezone в CRON задачу

**Файл:** `server/cron/conveyor-runner.ts`

**Изменить:**
```typescript
// Было:
cron.schedule("0 0 * * *", async () => {
  logger.info("[Conveyor Runner] Resetting daily counts");
  await conveyorSettingsStorage.resetDailyCounts();
});

// Стало:
cron.schedule("0 0 * * *", async () => {
  const resetTime = new Date();
  logger.info("[Conveyor Runner] Resetting daily counts", {
    timezone: process.env.CRON_TZ || 'UTC',
    resetTime: resetTime.toISOString(),
  });
  await conveyorSettingsStorage.resetDailyCounts();
}, {
  timezone: process.env.CRON_TZ || 'UTC'
});
```

---

### 2. Улучшить логирование в resetDailyCounts

**Файл:** `server/storage/conveyor-settings.storage.ts`

**Изменить:**
```typescript
// Было:
async resetDailyCounts(): Promise<void> {
  await db
    .update(conveyorSettings)
    .set({
      itemsProcessedToday: 0,
      lastResetAt: new Date(),
    });
}

// Стало:
async resetDailyCounts(): Promise<void> {
  const resetTime = new Date();
  const result = await db
    .update(conveyorSettings)
    .set({
      itemsProcessedToday: 0,
      lastResetAt: resetTime,
    })
    .returning({ id: conveyorSettings.id });
  
  logger.info("[Conveyor Settings] Daily counts reset", {
    resetCount: result.length,
    resetTime: resetTime.toISOString(),
  });
}
```

---

### 3. Добавить проверку lastResetAt в UI

**Рекомендация:** Показывать пользователю, когда последний раз был сброс:
```
Сегодня: 4/10
Последний сброс: 1 декабря, 00:00 UTC
Следующий сброс: 2 декабря, 00:00 UTC
```

---

## 🎯 ПРИЧИНЫ, ПОЧЕМУ СЧЁТЧИК НЕ ОБНУЛИЛСЯ

### Возможные причины:

1. **CRON задача не запустилась** (ошибка в коде)
2. **Сброс произошёл, но в неправильное время** (нет timezone)
3. **Сброс произошёл, но обновление не применилось** (ошибка БД)
4. **Сервер не работал в момент сброса** (перезапуск)

---

## 📝 ДИАГНОСТИКА

### Как проверить:

1. **Проверить логи сервера:**
   ```
   grep "Resetting daily counts" server.log
   ```

2. **Проверить БД:**
   ```sql
   SELECT 
     items_processed_today,
     last_reset_at,
     NOW() as current_time,
     NOW() - last_reset_at as time_since_reset
   FROM conveyor_settings
   WHERE user_id = 'your-user-id';
   ```

3. **Проверить, работает ли CRON:**
   - Проверить, запущен ли сервер
   - Проверить логи инициализации CRON

---

## ✅ ИТОГ

**Проблема:** Нет указания timezone в CRON задаче сброса

**Решение:** Добавить `timezone: process.env.CRON_TZ || 'UTC'` в опции `cron.schedule()`

**Результат:** Сброс будет происходить в 00:00 UTC, как и ожидается

---

**Документ готов!** 📚

