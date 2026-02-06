# 🔧 ИСПРАВЛЕНИЕ: 401 Unauthorized для scripts-media API

## Проблема

При попытке обращения к API endpoints `/api/scripts/:scriptId/media/*` возвращалась ошибка **401 Unauthorized**, несмотря на то что пользователь был авторизован в системе.

### Скриншоты ошибки:
- GET `/api/scripts/5c63f063-3240-46f7-bb54-dc44ed184c2d/media` → 401
- GET `/api/scripts/5c63f063-3240-46f7-bb54-dc44ed184c2d/media/status` → 401

## Причина

В файле `server/modules/scripts-media/scripts-media.routes.ts` **не использовался middleware `requireAuth`**, который необходим для:
1. Проверки JWT токена из cookie или Authorization header
2. Установки `req.userId` и `req.userEmail` в объекте request
3. Возврата 401 если токен отсутствует или невалиден

При этом контроллер проверял наличие `userId` через `getUserId(req)` и возвращал 401, но без middleware токен не проверялся вообще.

## Решение

### 1. Добавлен middleware `requireAuth` ко всем роутам

**Файл:** `server/modules/scripts-media/scripts-media.routes.ts`

```typescript
import { requireAuth } from "../../middleware/jwt-auth";

// Все роуты теперь защищены
router.get("/scripts/:scriptId/media", requireAuth, scriptsMediaController.getMedia);
router.put("/scripts/:scriptId/media", requireAuth, scriptsMediaController.upsertMedia);
router.patch("/scripts/:scriptId/media/audio", requireAuth, scriptsMediaController.updateAudio);
router.patch("/scripts/:scriptId/media/video", requireAuth, scriptsMediaController.updateVideo);
router.get("/scripts/:scriptId/media/status", requireAuth, scriptsMediaController.getStatus);
router.delete("/scripts/:scriptId/media", requireAuth, scriptsMediaController.deleteMedia);
```

### 2. Упрощён контроллер (убрана дублирующая проверка)

**Файл:** `server/modules/scripts-media/scripts-media.controller.ts`

**До:**
```typescript
async getMedia(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) return apiResponse.unauthorized(res); // Дублирующая проверка
  // ...
}
```

**После:**
```typescript
async getMedia(req: Request, res: Response) {
  const userId = getUserId(req); // requireAuth гарантирует наличие userId
  // ...
}
```

## Преимущества решения

1. ✅ **Согласованность**: Все модули проекта используют одинаковый паттерн аутентификации
2. ✅ **Безопасность**: Middleware проверяет токен ДО входа в контроллер
3. ✅ **Меньше кода**: Убрана дублирующая проверка в контроллерах
4. ✅ **Централизованная логика**: Вся проверка аутентификации в одном месте

## Паттерн проекта

Этот же паттерн используется во всех других модулях:

```typescript
// ✅ ПРАВИЛЬНО (как в scripts-library, news, ai и др.)
import { requireAuth } from "../../middleware/jwt-auth";

router.get("/path", requireAuth, controller.method);
```

```typescript
// ❌ НЕПРАВИЛЬНО (как было в scripts-media)
router.get("/path", controller.method);

// И проверка в контроллере
if (!userId) return apiResponse.unauthorized(res);
```

## Проверка

После применения исправления запросы к API должны работать:
- ✅ GET `/api/scripts/:scriptId/media` → 200 OK (или 404 если нет данных)
- ✅ PUT `/api/scripts/:scriptId/media` → 200 OK
- ✅ PATCH `/api/scripts/:scriptId/media/audio` → 200 OK
- ✅ PATCH `/api/scripts/:scriptId/media/video` → 200 OK
- ✅ GET `/api/scripts/:scriptId/media/status` → 200 OK
- ✅ DELETE `/api/scripts/:scriptId/media` → 200 OK

## Изменённые файлы

1. `server/modules/scripts-media/scripts-media.routes.ts` - добавлен requireAuth
2. `server/modules/scripts-media/scripts-media.controller.ts` - убрана дублирующая проверка

---

**Дата исправления:** 2026-02-06
**Статус:** ✅ Исправлено и готово к тестированию
