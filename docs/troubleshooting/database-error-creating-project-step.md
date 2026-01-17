# Решение ошибки "Error creating project step" (DatabaseError)

## 🐛 Проблема

При создании шагов проекта (project steps) возникает ошибка базы данных:

```
Error creating project step {"service":"stockmind-api","userId":"...","errorType":"DatabaseError"}
```

## 🔍 Причина

В таблице `project_steps` есть уникальный индекс на комбинацию `(projectId, stepNumber)`:

```sql
uniqueIndex("project_steps_project_step_unique").on(table.projectId, table.stepNumber)
```

Это означает, что **нельзя создать два шага с одинаковым номером для одного проекта**.

### Возможные сценарии возникновения ошибки:

1. **Повторный запрос**: Клиент отправил запрос дважды (например, двойной клик)
2. **Race condition**: Параллельные запросы пытаются создать один и тот же шаг
3. **Некорректная логика**: Код пытается создать уже существующий шаг без проверки

## ✅ Решение

### 1. Проверка существующего шага перед созданием (с UPDATE)

В `project-steps.service.ts`:

```typescript
async createProjectStep(projectId: string, userId: string, dto: CreateProjectStepDto) {
  await this.projectsService.getProjectById(projectId, userId);

  // Проверяем, существует ли уже этот шаг
  const existingSteps = await this.projectsService.getProjectSteps(projectId);
  const existingStep = existingSteps.find(s => s.stepNumber === dto.stepNumber);

  if (existingStep) {
    logger.info("Project step already exists, updating existing step", {
      projectId,
      stepNumber: dto.stepNumber,
      existingStepId: existingStep.id,
    });
    
    // ОБНОВЛЯЕМ существующий шаг новыми данными
    const updatedStep = await this.projectsService.updateProjectStep(existingStep.id, {
      data: dto.data,
      completedAt: dto.completedAt || existingStep.completedAt,
      skipReason: dto.skipReason || existingStep.skipReason,
    });
    
    return updatedStep; // Возвращаем обновлённый шаг
  }

  // Создаём новый шаг
  const stepData = { ...dto, projectId };
  const step = await this.projectsService.createProjectStep(stepData);
  
  return step;
}
```

**ВАЖНО**: Метод `POST /api/projects/:id/steps` теперь работает как **UPSERT** (create or update):
- Если шаг не существует → создаёт новый
- Если шаг существует → обновляет данные существующего

Это позволяет фронтенду использовать один endpoint для создания и обновления шагов.

### 2. Обработка ошибки уникального индекса

В `projects.repo.ts`:

```typescript
async createProjectStep(data: InsertProjectStep): Promise<ProjectStep> {
  try {
    const [step] = await db
      .insert(projectSteps)
      .values(data)
      .returning();
    return step;
  } catch (error: any) {
    // Обрабатываем нарушение уникального индекса (Postgres код 23505)
    if (error.code === '23505' && error.constraint === 'project_steps_project_step_unique') {
      throw new Error(`Project step ${data.stepNumber} already exists for project ${data.projectId}`);
    }
    throw error;
  }
}
```

### 3. Улучшенное логирование

В `project-steps.controller.ts`:

```typescript
logger.error("Error creating project step", {
  service: "stockmind-api",
  userId,
  errorType: error.constructor?.name,
  errorMessage: error.message,
  errorStack: error.stack,
  projectId: req.params?.id,
  requestBody: req.body,
});
```

Теперь мы логируем:
- Полное сообщение об ошибке
- Stack trace для отладки
- ID проекта
- Тело запроса

### 4. Удаление `as any`

Убрали небезопасные приведения типов (`as any`), которые скрывали проблемы:

**Было:**
```typescript
const step = await this.projectsService.createProjectStep(stepData as any);
```

**Стало:**
```typescript
const step = await this.projectsService.createProjectStep(stepData);
```

## 🛡️ Предотвращение в будущем

### Best Practices:

1. **Всегда проверяйте существование** перед созданием записи с уникальным индексом
2. **Обрабатывайте ошибки БД** явно (особенно код 23505 для уникальных индексов)
3. **Избегайте `as any`** - используйте правильную типизацию
4. **Логируйте детали** - добавляйте context в логи для диагностики

### Пример правильного подхода:

```typescript
// ✅ Хорошо: проверка перед созданием
const existing = await findExisting();
if (existing) return existing;
return await create();

// ❌ Плохо: создание без проверки
return await create(); // может упасть с DatabaseError
```

## 🧪 Тестирование

Для проверки исправления:

1. Попробуйте создать шаг дважды - должен вернуться существующий
2. Проверьте логи - должны быть детальные сообщения об ошибках
3. Убедитесь, что нет race conditions при параллельных запросах

## 📚 Связанные файлы

- `server/modules/project-steps/project-steps.service.ts` - бизнес-логика
- `server/modules/project-steps/project-steps.controller.ts` - обработка запросов
- `server/modules/projects/projects.repo.ts` - работа с БД
- `shared/schema/projects.ts` - схема таблицы project_steps
