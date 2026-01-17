# Endpoint GET /api/auth/me

## Описание
Получение данных текущего авторизованного пользователя.

## URL
```
GET /api/auth/me
```

## Middleware
- `requireAuth` - проверяет JWT токен и устанавливает `req.userId`

## Аутентификация
Требуется JWT токен в одном из следующих мест:
- Cookie `stockmind_auth_token` (httpOnly)
- HTTP заголовок `Authorization: Bearer <token>`

## Параметры запроса
Отсутствуют

## Успешный ответ

### Код статуса: `200 OK`

### Структура ответа:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "profileImageUrl": "https://example.com/avatar.jpg",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Поля ответа:
| Поле | Тип | Описание | Nullable |
|------|-----|----------|----------|
| `user.id` | string | UUID пользователя | нет |
| `user.email` | string | Email пользователя | нет |
| `user.firstName` | string \| null | Имя пользователя | да |
| `user.lastName` | string \| null | Фамилия пользователя | да |
| `user.profileImageUrl` | string \| null | URL аватара пользователя | да |
| `user.createdAt` | Date | Дата создания аккаунта | нет |

## Ответы при ошибках

### 401 Unauthorized
Токен отсутствует, невалиден или пользователь не найден в базе данных.

```json
{
  "message": "Authentication required"
}
```

или

```json
{
  "message": "Authentication failed"
}
```

### 404 Not Found
Пользователь с указанным ID не найден в базе данных (крайний случай, если пользователь был удален после успешной аутентификации).

```json
{
  "message": "User with id <uuid> not found"
}
```

### 500 Internal Server Error
Внутренняя ошибка сервера или ошибка базы данных.

```json
{
  "message": "Failed to get user data",
  "error": "Database connection error"
}
```

## Примеры использования

### cURL с cookie
```bash
curl -b cookies.txt \
  -X GET http://localhost:5000/api/auth/me
```

### cURL с Bearer token
```bash
curl -H "Authorization: Bearer eyJhbGc..." \
  -X GET http://localhost:5000/api/auth/me
```

### JavaScript (fetch)
```javascript
// С credentials (автоматически отправляет cookie)
const response = await fetch('/api/auth/me', {
  credentials: 'include'
});

const data = await response.json();
console.log(data.user);
```

### React Hook (из auth-context)
```typescript
const { user, isLoading } = useAuth();

// user содержит данные из /api/auth/me
console.log(user?.email);
```

## Логирование

### Успешный запрос
```
INFO: Get current user request { userId: "uuid" }
```

### Ошибка
```
ERROR: Get current user failed { error: Error, userId: "uuid" }
```

## Безопасность

- ✅ Исключены поля `passwordHash` и `updatedAt` из ответа
- ✅ Требуется валидный JWT токен
- ✅ Middleware проверяет существование пользователя в БД
- ✅ Логирование всех запросов для аудита
- ✅ Rate limiting применяется глобально (если настроен)

## Связанные файлы

### Backend
- `server/modules/auth/auth.controller.ts` - контроллер с методом `getMe`
- `server/modules/auth/auth.routes.ts` - регистрация маршрута
- `server/modules/user/user.service.ts` - сервис получения пользователя
- `server/middleware/jwt-auth.ts` - middleware аутентификации

### Frontend
- `client/src/lib/auth-context.tsx` - контекст аутентификации
- `client/src/pages/auth/login-page.tsx` - страница входа
- `client/src/pages/auth/register-page.tsx` - страница регистрации

## Типы данных

### TypeScript интерфейс (из auth.dto.ts)
```typescript
export interface AuthUserResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  createdAt?: Date;
}
```

### Модель User (из schema)
```typescript
{
  id: string
  email: string
  passwordHash: text | null
  firstName: string | null
  lastName: string | null
  profileImageUrl: string | null
  createdAt: Date
  updatedAt: Date
}
```

## Тестирование

Используйте скрипт для тестирования:
```bash
bash scripts/test-me-endpoint.sh
```

Или вручную:
```bash
# 1. Войти в систему
curl -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword123"}'

# 2. Получить данные пользователя
curl -b cookies.txt http://localhost:5000/api/auth/me
```

## Примечания

- Endpoint использует существующий `userService.getById()`
- Ошибки обрабатываются на уровне контроллера
- Соответствует структуре ответа, ожидаемой клиентом
- Не требует дополнительных миграций БД
