# Исправление: Сохранение сценариев из рецензии в черновики

## Дата: 2026-02-03

### История изменений:
- **v1.0** (2026-02-03 14:00): Первоначальное исправление с проверкой `isAutoScript`
- **v1.1** (2026-02-03 14:30): Упрощение кода - убрана избыточная проверка `isAutoScript`

## Проблема

После нажатия на кнопку "Сохранить в черновики" или "Сохранить в готовые" в блоке "Сценарии на рецензии":
- ❌ Сценарий пропадал из блока "На рецензии"
- ❌ НО не появлялся ни в разделе "Черновики", ни в "Готовые сценарии"
- ❌ Сценарий оказывался "потерянным" для пользователя

## Причина

Существовало архитектурное несоответствие между двумя таблицами базы данных:

### Таблица `auto_scripts`
- Используется для сценариев в процессе генерации и рецензии
- Статусы: `pending`, `revision`, `approved`, `rejected`
- Источник данных для страницы "Сценарии на рецензии"

### Таблица `scripts_library`
- Используется для пользовательских черновиков и готовых сценариев
- Статусы: `draft`, `ready`, `completed`
- Источник данных для страницы "Черновики"

### Что было не так в старом коде:

```typescript
// Старая логика для черновиков (НЕПРАВИЛЬНО)
const updateData: any = { status: 'draft' }
await scriptsService.updateScriptUniversal(scriptId, updateData)

// Старая логика для готовых (НЕПРАВИЛЬНО)
await scriptsService.updateScriptUniversal(scriptId, { status: 'ready' })
```

Эта логика просто меняла статус записи в `auto_scripts`, но:
- Страница рецензий читает: `SELECT * FROM auto_scripts WHERE status = 'pending'`
- Страница черновиков читает: `SELECT * FROM scripts_library WHERE status = 'draft'`
- Страница готовых читает: `SELECT * FROM scripts_library WHERE status = 'ready'`

Результат: сценарий исчезал из `auto_scripts.pending`, но не появлялся в `scripts_library`.

## Решение

### 1. Определение источника сценария (v1.1 - упрощено)

~~Изначально добавлялась проверка типа сценария:~~

```typescript
// v1.0 (избыточная логика)
const isAutoScript = 'finalScore' in currentScript || 'revisionCount' in currentScript
if (isAutoScript && isReviewMode) { ... }
```

**Упрощение:** Проверка `isAutoScript` оказалась избыточной, так как:
- `mode=review` используется **только** при открытии из `auto_scripts` (status='pending')
- `mode=draft` используется **только** при открытии из `scripts_library`
- Режим однозначно определяет тип сценария

Финальная версия (v1.1):

```typescript
// Режим определяет тип на 100%
if (isReviewMode) {
  // Это гарантированно auto_script
  ...
} else {
  // Это гарантированно library_script
  ...
}
```

### 2. Разная логика для разных типов

#### Для auto_scripts в режиме рецензии (черновики):

```typescript
// v1.1 - упрощенная логика
if (isReviewMode) {
  // Это гарантированно auto_script - режим однозначно определяет тип
  const libraryScript = await scriptsService.saveAutoScriptToLibrary(scriptId, 'draft')
  await scriptsService.updateScriptStatus(scriptId, 'rejected')
  // Инвалидация кэша и переход
  navigate(`/conveyor/editor/${libraryScript.id}?mode=draft`)
}
```

#### Для auto_scripts в режиме рецензии (готовые):

```typescript
// v1.1 - упрощенная логика
if (isReviewMode) {
  // Это гарантированно auto_script - режим однозначно определяет тип
  const libraryScript = await scriptsService.saveAutoScriptToLibrary(scriptId, 'ready')
  await scriptsService.updateScriptStatus(scriptId, 'approved')
  // Инвалидация кэша и переход
  navigate(`/conveyor/editor/${libraryScript.id}?mode=draft`)
}
```

#### Для library_scripts:

```typescript
else {
  // Просто обновляем статус на 'draft' или 'ready'
  await scriptsService.updateScript(scriptId, { status: status })
}
```

### 3. Функция `saveAutoScriptToLibrary`

Эта функция:
1. Получает полные данные `auto_script` включая итерации и рецензии
2. Извлекает оценку AI из последней рецензии
3. Создает новую запись в `scripts_library` со всеми данными
4. Возвращает созданный черновик

```typescript
export async function saveAutoScriptToLibrary(
  autoScriptId: string,
  status: 'draft' | 'ready' | 'completed'
): Promise<Script> {
  const autoScript = await getAutoScript(autoScriptId)
  
  // Извлекаем оценку из рецензии
  let aiScore = autoScript.score ?? (autoScript as any).finalScore ?? 0
  
  if ((autoScript as any).iterations) {
    const iterations = (autoScript as any).iterations
    for (let i = iterations.length - 1; i >= 0; i--) {
      if (iterations[i].review?.overallScore) {
        aiScore = Math.round((iterations[i].review.overallScore / 10) * 100)
        break
      }
    }
  }
  
  // Создаем запись в scripts_library
  return await createScriptInLibrary({
    title: autoScript.title || autoScript.newsTitle,
    status: status,
    scenes: autoScript.scenes || [],
    fullText: autoScript.scenes?.map(s => s.text).join('\n') || '',
    format: autoScript.formatId || autoScript.formatName,
    aiScore: aiScore,
    sourceType: autoScript.sourceType || 'rss',
    sourceId: autoScriptId,
    sourceTitle: autoScript.title || autoScript.newsTitle,
  })
}
```

## Измененные файлы

## Измененные файлы

### Frontend
- `client/src/features/conveyor/components/ScriptEditorPage.tsx`
  - **v1.0**: Функции `handleSaveToDraft` и `handleSaveToReady` переработаны с проверкой `isAutoScript`
  - **v1.1**: Убрана избыточная проверка `isAutoScript`, код упрощен - режим определяет тип на 100%

## Результат

### ✅ После исправления:

1. **Нажатие "Сохранить в черновики" в режиме рецензии:**
   - Создается новая запись в `scripts_library` со статусом `'draft'`
   - Исходный `auto_script` помечается как `'rejected'`
   - Сценарий исчезает из "Сценарии на рецензии"
   - Сценарий **появляется** в разделе "Черновики"
   - Автоматический переход к редактированию черновика

2. **Нажатие "Сохранить в готовые" в режиме рецензии:**
   - Создается новая запись в `scripts_library` со статусом `'ready'`
   - Исходный `auto_script` помечается как `'approved'`
   - Сценарий исчезает из "Сценарии на рецензии"
   - Сценарий **появляется** в разделе "Готовые сценарии"
   - Автоматический переход к просмотру готового сценария

3. **Сохранение оценки AI:**
   - Оценка из рецензии (overallScore) корректно переносится
   - Конвертация из 10-балльной в 100-балльную систему
   - Отображается на соответствующей странице

4. **Обновление UI:**
   - Счетчик "На рецензии" на дашборде уменьшается
   - Списки черновиков и готовых сценариев обновляются автоматически
   - Корректная инвалидация всех связанных запросов

## Тестирование

### Сценарий 1: Сохранение из рецензии
1. Перейти на страницу "Сценарии на рецензии"
2. Выбрать любой сценарий
3. Нажать "Сохранить в черновики"
4. Проверить:
   - ✅ Сценарий исчез из рецензии
   - ✅ Сценарий появился в черновиках
   - ✅ Оценка AI сохранилась
   - ✅ Автоматический переход к редактору черновика

### Сценарий 2: Сохранение в готовые из рецензии
1. Перейти на страницу "Сценарии на рецензии"
2. Выбрать любой сценарий
3. Нажать "Сохранить в готовые"
4. Проверить:
   - ✅ Сценарий исчез из рецензии
   - ✅ Сценарий появился в готовых
   - ✅ Оценка AI сохранилась
   - ✅ Статус auto_script изменился на 'approved'

### Сценарий 3: Сохранение черновика из библиотеки
1. Открыть существующий черновик
2. Внести изменения
3. Нажать "Сохранить в черновики"
4. Проверить:
   - ✅ Изменения сохранены
   - ✅ Статус остался `'draft'`
   - ✅ Если был анализ, корректно обработан флаг переоценки

## Технические детали

### Почему проверка `isAutoScript` была избыточна

#### Архитектурный анализ (v1.1):

**Источники `mode=review`:**
1. `ConveyorDashboard` → `dashboard.pendingReview.scripts` 
   - SQL: `SELECT * FROM auto_scripts WHERE status = 'pending'`
   - Результат: **100% auto_scripts**

2. `ScriptsReviewPage` → `useScripts({ status: 'pending' })`
   - API: `GET /api/auto-scripts?status=pending`
   - Результат: **100% auto_scripts**

**Источники `mode=draft`:**
1. `DraftsPage` → клик на черновик
   - SQL: `SELECT * FROM scripts_library WHERE status = 'draft'`
   - Результат: **100% library_scripts**

2. После сохранения → `navigate(...?mode=draft)`
   - Переход после `saveAutoScriptToLibrary()`
   - Результат: **100% library_scripts**

**Вывод:** Режим (`isReviewMode`) на 100% определяет тип сценария. Дополнительная проверка типа не нужна.

### Архитектура решения (v1.1)

```
┌─────────────────────┐
│   auto_scripts      │
│  (status: pending)  │
└──────────┬──────────┘
           │
           │ Кнопка "Сохранить в черновики"
           │
           ├── 1. saveAutoScriptToLibrary()
           │      └─> Создает запись в scripts_library
           │
           ├── 2. updateScriptStatus('rejected')
           │      └─> Меняет статус в auto_scripts
           │
           └── 3. navigate('/conveyor/editor/:newId?mode=draft')
                  └─> Открывает новый черновик
                  
┌─────────────────────┐
│  scripts_library    │
│  (status: draft)    │
└─────────────────────┘
```

### Поля при копировании

Из `auto_scripts` в `scripts_library` переносятся:
- ✅ `title` / `newsTitle`
- ✅ `scenes` (массив сцен)
- ✅ `fullText` (объединенный текст)
- ✅ `formatId` / `formatName`
- ✅ `aiScore` (из рецензии)
- ✅ `sourceType` (rss/instagram)
- ✅ `sourceId` (ссылка на исходный auto_script)
- ✅ `sourceTitle`

## Потенциальные улучшения

1. **Удаление вместо reject:** 
   - Можно удалять `auto_script` вместо маркировки как `'rejected'`
   - Плюс: чище БД
   - Минус: теряется история

2. **Двусторонняя связь:**
   - Добавить поле `library_script_id` в `auto_scripts`
   - Позволит отслеживать, был ли уже сохранен в библиотеку

3. **Уведомления:**
   - Показывать toast с кнопкой "Перейти к черновикам"
   - Опция отменить действие

## Заключение

Исправление устраняет критическую проблему, когда пользователи теряли сценарии при попытке сохранить их в черновики. Решение учитывает архитектурные особенности системы с двумя независимыми таблицами и обеспечивает корректную работу во всех сценариях использования.
