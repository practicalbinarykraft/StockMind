# Исправление: Stage 4 не загружает сценарий

## 🐛 Проблема

На Stage 4 (Voice Generation) не загружается сценарий из Stage 3.

## 🔍 Причина

Метод `POST /api/projects/:id/steps` использовался для:
1. **Создания нового шага** (при первом сохранении)
2. **Обновления существующего шага** (при повторном сохранении)

После исправления ошибки DatabaseError, метод стал:
- Проверять существование шага
- **Возвращать старый шаг** без обновления данных

**Проблемный код** (старый):
```typescript
if (existingStep) {
  logger.warn("Project step already exists, returning existing step");
  return existingStep; // ❌ Данные не обновляются!
}
```

## ✅ Решение

Изменена логика метода `createProjectStep` на **UPSERT** (create or update):

```typescript
async createProjectStep(projectId: string, userId: string, dto: CreateProjectStepDto) {
  // ... проверка прав доступа ...

  const existingSteps = await this.projectsService.getProjectSteps(projectId);
  const existingStep = existingSteps.find(s => s.stepNumber === dto.stepNumber);

  if (existingStep) {
    logger.info("Project step already exists, updating existing step");
    
    // ✅ ОБНОВЛЯЕМ существующий шаг
    const updatedStep = await this.projectsService.updateProjectStep(existingStep.id, {
      data: dto.data,
      completedAt: dto.completedAt || existingStep.completedAt,
      skipReason: dto.skipReason || existingStep.skipReason,
    });
    
    return updatedStep;
  }

  // Создаём новый шаг
  const stepData = { ...dto, projectId };
  return await this.projectsService.createProjectStep(stepData);
}
```

## 🎯 Результат

Теперь `POST /api/projects/:id/steps` работает как **UPSERT**:
- ✅ Если шаг **не существует** → создаёт новый
- ✅ Если шаг **существует** → обновляет данные

### Пример использования (Stage 3 → Stage 4):

**Stage 3** сохраняет финальный сценарий:
```typescript
await apiRequest("POST", `/api/projects/${projectId}/steps`, {
  stepNumber: 3,
  data: {
    finalScript: {
      scenes: [...],
      selectedVariants: {...},
      totalWords: 150,
      duration: 60
    }
  }
});
```

**Stage 4** загружает сценарий из step 3:
```typescript
// Получаем данные step 3
const step3Data = steps.find(s => s.stepNumber === 3);
const finalScript = step3Data?.data?.finalScript; // ✅ Данные загружены!
```

## 📝 Дополнительные улучшения

Метод также корректно обрабатывает:
- `completedAt` - дата завершения шага
- `skipReason` - причина пропуска шага
- Логирование действий (create vs update)

## 🧪 Тестирование

1. Создайте проект и пройдите до Stage 3
2. Выберите варианты сценария и нажмите "Продолжить"
3. Перейдите на Stage 4
4. ✅ Сценарий должен загрузиться в редактор

## 📂 Изменённые файлы

- `server/modules/project-steps/project-steps.service.ts` - логика UPSERT
- `docs/troubleshooting/database-error-creating-project-step.md` - обновлена документация
