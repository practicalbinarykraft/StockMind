# 🔍 ПРОВЕРКА ЛОГИКИ РЕВИЗИИ

**Дата проверки:** 2024  
**Статус:** ❌ Найдены проблемы

---

## 📋 ЧТО ДОЛЖНО ПРОИСХОДИТЬ

1. Пользователь отправляет ревизию → сценарий помечается как "revision"
2. Создаётся новый `conveyor_item` с `revisionContext`
3. Запускается обработка через конвейер (с этапа Writer)
4. После завершения → сценарий обновляется, статус = "pending"
5. **Новая версия должна быть видна в общем списке с пометкой**

---

## 🔍 ЧТО ПРОИСХОДИТ СЕЙЧАС

### ЭТАП 1: Отправка ревизии ✅

**Файл:** `server/routes/auto-scripts.routes.ts:454-580`

**Что происходит:**
```typescript
// 1. Валидация запроса
const { feedbackText, selectedSceneIds } = reviseSchema.parse(req.body);

// 2. Проверка сценария
const script = await autoScriptsStorage.getById(id);

// 3. Проверка лимита
if (script.revisionCount >= MAX_REVISIONS) {
  // Auto-reject
}

// 4. Помечаем как "revision"
await autoScriptsStorage.markRevision(id, feedbackText);

// 5. Обновляем Learning System
await learningService.onRevise(userId, id, feedbackText);

// 6. Создаём conveyor_item и запускаем обработку
if (apiKey) {
  const revisionResult = await revisionProcessor.createRevisionItem(
    script,
    feedbackText,
    selectedSceneIds
  );
  
  if (revisionResult.success) {
    // Запускаем обработку асинхронно
    conveyorOrchestrator.processRevisionItem(
      revisionResult.conveyorItemId,
      apiKey
    ).then(...).catch(...);
  }
}
```

**✅ РАБОТАЕТ ПРАВИЛЬНО**

---

### ЭТАП 2: Создание conveyor_item ✅

**Файл:** `server/conveyor/revision-processor.ts:36-111`

**Что происходит:**
```typescript
async createRevisionItem(script, feedbackText, selectedSceneIds) {
  // 1. Получаем оригинальный conveyor_item
  const parentItem = await conveyorItemsStorage.getById(script.conveyorItemId);
  
  // 2. Получаем историю версий
  const versions = await autoScriptVersionsStorage.getByScriptId(script.id);
  
  // 3. Создаём revisionContext
  const revisionContext = {
    notes: feedbackText,
    previousScriptId: script.id,
    attempt: script.revisionCount + 1,
    previousVersions: [...],
    selectedSceneIds: selectedSceneIds,
  };
  
  // 4. Создаём новый conveyor_item
  const newItem = await conveyorItemsStorage.createForRevision(
    parentItem,
    revisionContext
  );
  
  return { success: true, conveyorItemId: newItem.id };
}
```

**✅ РАБОТАЕТ ПРАВИЛЬНО**

---

### ЭТАП 3: Обработка через конвейер ✅

**Файл:** `server/conveyor/conveyor-orchestrator.ts:343-518`

**Что происходит:**
```typescript
async processRevisionItem(conveyorItemId, apiKey) {
  // 1. Получаем conveyor_item
  const item = await conveyorItemsStorage.getById(conveyorItemId);
  
  // 2. Проверяем, что это revision item
  if (!item.revisionContext || !item.parentItemId) {
    return { success: false, error: "Not a revision item" };
  }
  
  // 3. Пропускаем этапы 1-4 (используем данные из parent)
  const sourceData = item.sourceData;  // Скопировано из parent
  const analysis = item.analysisData;  // Скопировано из parent
  const architecture = item.architectureData;  // Скопировано из parent
  
  // 4. Запускаем с этапа 5 (Writer)
  const writerResult = await writerAgent.process({
    ...,
    revisionContext: {
      notes: revisionContext.notes,
      previousScriptId: revisionContext.previousScriptId,
      attempt: revisionContext.attempt,
      previousVersions: revisionContext.previousVersions,
      selectedSceneIds: revisionContext.selectedSceneIds,
    },
  });
  
  // 5. QC → Optimizer → Gate
  // 6. Delivery обновляет auto_script
}
```

**✅ РАБОТАЕТ ПРАВИЛЬНО**

---

### ЭТАП 4: Обновление auto_script ✅

**Файл:** `server/conveyor/agents/delivery-agent.ts:127-187`

**Что происходит:**
```typescript
private async executeRevision(input, context) {
  const scriptId = revisionContext.previousScriptId;
  
  // 1. Обновляем существующий auto_script
  const updatedScript = await autoScriptsStorage.updateAfterRevision(scriptId, {
    scenes: script.scenes,
    fullScript: script.fullScript,
    initialScore: qc.overallScore,
    finalScore: gate.finalScore,
    // ... другие поля
  });
  
  // 2. Создаём версию в auto_script_versions
  await autoScriptVersionsStorage.create({
    autoScriptId: scriptId,
    versionNumber: revisionContext.attempt,
    scenes: script.scenes,
    fullScript: script.fullScript,
    feedbackText: revisionContext.notes,
    feedbackSceneIds: revisionContext.selectedSceneIds,
  });
  
  return { scriptId, delivered: true };
}
```

**updateAfterRevision:**
```typescript
async updateAfterRevision(id, data) {
  const [script] = await db
    .update(autoScripts)
    .set({
      ...data,
      status: 'pending',  // ← Возвращаем в pending!
      revisionNotes: null,
    })
    .where(eq(autoScripts.id, id))
    .returning();
  return script;
}
```

**✅ РАБОТАЕТ ПРАВИЛЬНО**

---

## ✅ ПРОВЕРКА: API УЖЕ ИСПОЛЬЗУЕТ getForReview

**Файл:** `server/routes/auto-scripts.routes.ts:220-248`

**Что делает API:**
```typescript
app.get("/api/auto-scripts", requireAuth, async (req, res) => {
  const { status } = req.query;
  
  // Когда запрашивают "pending", используем getForReview
  // Это включает И "pending" И "revision" статусы
  if (status === 'pending') {
    scripts = await autoScriptsStorage.getForReview(userId);
  } else {
    scripts = await autoScriptsStorage.getByUser(userId, status);
  }
  
  res.json(scripts);
});
```

**✅ ПРАВИЛЬНО:** API уже использует `getForReview()` для статуса "pending"!

---

## 🔍 ПРОВЕРКА: ПОЧЕМУ МОЖЕТ ЗАВИСАТЬ

### Возможные причины зависания:

1. **Обработка не запускается:**
   - Нет API key → проверка в строке 536-543
   - Ошибка при создании revision item → логи в revision-processor.ts

2. **Обработка падает с ошибкой:**
   - Проверить логи: `Revision processing failed` (строка 567-574)
   - Проверить статус `conveyor_item` в БД

3. **Delivery не обновляет auto_script:**
   - Проверить логи: `script_revised` event (delivery-agent.ts:174-184)
   - Проверить, вызывается ли `updateAfterRevision`

4. **UI не обновляется:**
   - Проверить, работает ли `refetchInterval` (строка 107-110)
   - Проверить, меняется ли статус в БД с "revision" на "pending"

---

## 🔧 ДИАГНОСТИКА ЗАВИСАНИЯ

### Шаг 1: Проверить логи сервера

**Что искать:**
```
[RevisionProcessor] Created revision item
[Conveyor] Starting revision processing
[Conveyor] Writer processing...
[Conveyor] QC processing...
[Conveyor] Gate decision: PASS/FAIL/NEEDS_REVIEW
[Delivery] Script revised
Revision processing completed
```

**Если нет логов:**
- Обработка не запускается
- Проверить API key (строка 536-543)
- Проверить, создаётся ли conveyor_item

---

### Шаг 2: Проверить БД

**Проверить conveyor_items:**
```sql
SELECT id, status, current_stage, error_message, error_stage
FROM conveyor_items
WHERE parent_item_id IS NOT NULL
ORDER BY started_at DESC
LIMIT 10;
```

**Проверить auto_scripts:**
```sql
SELECT id, status, revision_count, revision_notes, updated_at
FROM auto_scripts
WHERE status = 'revision'
ORDER BY updated_at DESC;
```

---

### Шаг 3: Проверить UI

**Что проверить:**
- Обновляется ли список каждые 5 секунд (если есть status="revision")
- Показывается ли бейдж "На ревизии"
- Приходит ли уведомление "Ревизия завершена!" после завершения

---

## 🔧 ВОЗМОЖНЫЕ ИСПРАВЛЕНИЯ

### Если обработка не запускается:

**Проблема:** Нет API key или ошибка при создании revision item

**Решение:** Добавить более детальное логирование:
```typescript
// server/routes/auto-scripts.routes.ts:546-580
if (apiKey) {
  try {
    const revisionResult = await revisionProcessor.createRevisionItem(...);
    
    if (revisionResult.success && revisionResult.conveyorItemId) {
      logger.info("Starting revision processing", {
        scriptId: id,
        conveyorItemId: revisionResult.conveyorItemId,
      });
      
      // Запускаем обработку
      conveyorOrchestrator.processRevisionItem(...)
        .then(...)
        .catch((err) => {
          logger.error("Revision processing error", {
            error: err.message,
            stack: err.stack,
          });
        });
    } else {
      logger.error("Failed to create revision item", {
        error: revisionResult.error,
      });
    }
  } catch (error) {
    logger.error("Error in revision processing setup", {
      error: error.message,
      stack: error.stack,
    });
  }
} else {
  logger.warn("No API key available for revision", { userId });
}
```

---

### Если обработка падает:

**Проблема:** Ошибка в процессе обработки (Writer, QC, Gate, Delivery)

**Решение:** Проверить логи каждого этапа и добавить retry логику

---

### Если UI не обновляется:

**Проблема:** Статус не меняется с "revision" на "pending"

**Решение:** Проверить, вызывается ли `updateAfterRevision` в delivery-agent

---

## 📊 ТЕКУЩЕЕ ПОВЕДЕНИЕ VS ОЖИДАЕМОЕ

### ТЕКУЩЕЕ (НЕПРАВИЛЬНО):

```
1. Пользователь отправляет ревизию
   ↓
2. Сценарий помечается как "revision"
   ↓
3. Создаётся conveyor_item, запускается обработка
   ↓
4. UI запрашивает /api/auto-scripts?status=pending
   ↓
5. API возвращает ТОЛЬКО status="pending"
   ↓
6. ❌ Сценарий в статусе "revision" НЕ показывается!
   ↓
7. После завершения → статус = "pending"
   ↓
8. ✅ Сценарий появляется в списке (но без пометки о новой версии)
```

### ОЖИДАЕМОЕ (ПРАВИЛЬНО):

```
1. Пользователь отправляет ревизию
   ↓
2. Сценарий помечается как "revision"
   ↓
3. Создаётся conveyor_item, запускается обработка
   ↓
4. UI запрашивает /api/auto-scripts?status=pending
   ↓
5. API возвращает status="pending" И status="revision"
   ↓
6. ✅ Сценарий показывается в списке с бейджем "На ревизии"
   ↓
7. UI обновляется каждые 5 секунд
   ↓
8. После завершения → статус = "pending"
   ↓
9. ✅ Сценарий обновляется в списке (новый текст, новые scores)
   ↓
10. ✅ Показывается бейдж "Ревизия #1" (если revisionCount > 0)
```

---

## 🎯 ЧТО НУЖНО ИСПРАВИТЬ

1. **Изменить API endpoint** `/api/auto-scripts?status=pending`:
   - Использовать `getForReview()` вместо `getByStatus()`
   - Возвращать сценарии с status="pending" И status="revision"

2. **Проверить UI отображение:**
   - Бейдж "На ревизии" уже есть (строка 356-361)
   - Бейдж "Ревизия #N" уже есть (строка 362-366)
   - Автообновление каждые 5 секунд уже есть (строка 107-110)

3. **Добавить пометку о новой версии:**
   - После завершения ревизии показывать уведомление (уже есть, строка 124-129)
   - Можно добавить визуальное выделение обновлённого сценария

---

## 📝 ПРОВЕРКА: ГДЕ ЗАВИСАЕТ

### Возможные причины зависания:

1. **Обработка не запускается:**
   - Проверить, есть ли API key
   - Проверить логи: `conveyorOrchestrator.processRevisionItem`

2. **Обработка падает с ошибкой:**
   - Проверить логи: `Revision processing failed`
   - Проверить статус `conveyor_item`: должен быть "processing" или "failed"

3. **Delivery не обновляет auto_script:**
   - Проверить логи: `script_revised` event
   - Проверить, вызывается ли `updateAfterRevision`

4. **UI не обновляется:**
   - Проверить, работает ли `refetchInterval`
   - Проверить, меняется ли статус в БД

---

## ✅ ИТОГ

**Что работает:**
- ✅ API использует `getForReview()` для status="pending" (включает "revision")
- ✅ Создание revision item
- ✅ Обработка через конвейер
- ✅ Обновление auto_script после завершения
- ✅ Создание версий
- ✅ UI показывает бейдж "На ревизии"
- ✅ UI обновляется каждые 5 секунд
- ✅ UI показывает уведомление после завершения

**Что может быть проблемой:**
- ⚠️ Обработка может не запускаться (нет API key)
- ⚠️ Обработка может падать с ошибкой (нужно проверить логи)
- ⚠️ Статус может не обновляться (нужно проверить delivery-agent)

**Что нужно проверить:**
1. Логи сервера при отправке ревизии
2. Статус `conveyor_item` в БД
3. Статус `auto_script` в БД (должен меняться с "revision" на "pending")
4. Работает ли автообновление в UI

**Рекомендации:**
- Добавить более детальное логирование в revision-processor и delivery-agent
- Добавить индикатор прогресса обработки (какой этап сейчас)
- Добавить кнопку "Проверить статус" для ручного обновления

---

## 📝 ПРОСТОЕ ОБЪЯСНЕНИЕ

### Куда уходит статья на доработку?

1. **Отправка ревизии:**
   - Сценарий помечается как `status = "revision"`
   - Создаётся новый `conveyor_item` с `revisionContext`
   - Запускается обработка через конвейер (асинхронно)

2. **Где она находится:**
   - В таблице `conveyor_items` (статус "processing")
   - В таблице `auto_scripts` (статус "revision")
   - **Должна быть видна в UI** с бейджем "На ревизии"

3. **После завершения:**
   - Статус меняется на `status = "pending"`
   - Сценарий обновляется (новый текст, новые scores)
   - Создаётся версия в `auto_script_versions`
   - **Должна быть видна в UI** с обновлённым содержимым

### Почему может зависать?

1. **Обработка не запускается:**
   - Нет API key → проверьте настройки
   - Ошибка при создании revision item → проверьте логи

2. **Обработка падает:**
   - Ошибка в Writer/QC/Gate → проверьте логи
   - Проверьте статус `conveyor_item` в БД

3. **Статус не обновляется:**
   - Delivery не вызывается → проверьте логи
   - Проверьте, вызывается ли `updateAfterRevision`

### Где новая версия?

- **В том же сценарии** (не создаётся новый)
- **Обновляется содержимое** (scenes, fullScript, scores)
- **Создаётся версия** в `auto_script_versions`
- **Статус меняется** с "revision" на "pending"
- **Должна быть видна в списке** с обновлёнными данными

---

**Документ готов!** 📚

