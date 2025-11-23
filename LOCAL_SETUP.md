# 🏠 Локальная Установка StockMind

Полное руководство по установке и запуску проекта на вашем компьютере.

---

## 📊 Текущая База Данных

**Сейчас используется:** Neon PostgreSQL (serverless, облачная)

**Для локальной разработки можно использовать:**
- ✅ Обычный PostgreSQL (рекомендуется)
- ✅ Docker PostgreSQL (самый простой способ)
- ✅ Neon PostgreSQL (если хотите использовать облачную БД)

**Код полностью совместим** с любым PostgreSQL - нужно только изменить `DATABASE_URL`.

---

## 🚀 Быстрый Старт (5 минут)

### Вариант 1: Docker PostgreSQL (Самый Простой)

```bash
# 1. Клонируйте проект
git clone https://github.com/practicalbinarykraft/StockMind.git
cd StockMind

# 2. Запустите PostgreSQL в Docker
docker run -d \
  --name stockmind-postgres \
  -e POSTGRES_USER=stockmind \
  -e POSTGRES_PASSWORD=stockmind_dev \
  -e POSTGRES_DB=stockmind \
  -p 5432:5432 \
  postgres:16

# 3. Установите зависимости
npm install

# 4. Создайте .env файл
cat > .env << 'EOF'
# Database
DATABASE_URL=postgresql://stockmind:stockmind_dev@localhost:5432/stockmind

# Authentication (ОБЯЗАТЕЛЬНО!)
SESSION_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)

# Application
NODE_ENV=development
PORT=5000
BASE_URL=http://localhost:5000

# CORS (для локалки не нужно, localhost разрешен автоматически)
# ALLOWED_ORIGINS=

# Опционально: Error monitoring
# SENTRY_DSN=
# VITE_SENTRY_DSN=

# Опционально: Instagram Business API
# FB_APP_ID=
# FB_APP_SECRET=
EOF

# 5. Сгенерируйте секреты вручную
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env

# 6. Примените миграцию БД
npm run db:push

# 7. Запустите проект
npm run dev

# 8. Откройте в браузере
# http://localhost:5173 - Frontend
# http://localhost:5000 - Backend API
```

**Готово!** 🎉 Проект запущен локально.

---

### Вариант 2: Обычный PostgreSQL (Установленный на Системе)

#### Шаг 1: Установите PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS (Homebrew):**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Windows:**
Скачайте установщик с https://www.postgresql.org/download/windows/

#### Шаг 2: Создайте Базу Данных

```bash
# Войдите в PostgreSQL
sudo -u postgres psql

# Создайте пользователя и БД
CREATE USER stockmind WITH PASSWORD 'your_password_here';
CREATE DATABASE stockmind OWNER stockmind;
GRANT ALL PRIVILEGES ON DATABASE stockmind TO stockmind;

# Выход
\q
```

#### Шаг 3: Клонируйте и Настройте Проект

```bash
# 1. Клонируйте проект
git clone https://github.com/practicalbinarykraft/StockMind.git
cd StockMind

# 2. Установите зависимости
npm install

# 3. Создайте .env файл
cp .env.example .env

# 4. Отредактируйте .env
nano .env
# Или используйте ваш любимый редактор
```

**Содержимое .env:**
```bash
# Database (замените password на ваш)
DATABASE_URL=postgresql://stockmind:your_password_here@localhost:5432/stockmind

# Authentication (ОБЯЗАТЕЛЬНО! Генерируйте уникальные секреты)
SESSION_SECRET=<вставьте результат: openssl rand -base64 32>
JWT_SECRET=<вставьте результат: openssl rand -base64 32>

# Application
NODE_ENV=development
PORT=5000
BASE_URL=http://localhost:5000
```

#### Шаг 4: Примените Миграцию и Запустите

```bash
# 1. Примените схему БД
npm run db:push

# 2. Запустите проект
npm run dev

# 3. Откройте браузер
# http://localhost:5173
```

---

## 🔐 Создание Первого Пользователя

После запуска проекта создайте первого пользователя:

### Вариант A: Через Frontend

1. Откройте http://localhost:5173
2. Нажмите "Get Started" или перейдите на http://localhost:5173/login
3. Переключитесь на "Sign up"
4. Введите email, пароль (минимум 8 символов), имя
5. Нажмите "Create Account"

### Вариант B: Через API (curl)

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "AdminPassword123!",
    "firstName": "Admin",
    "lastName": "User"
  }'
```

**Ответ:**
```json
{
  "message": "Registration successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid-here",
    "email": "admin@example.com",
    "firstName": "Admin",
    "lastName": "User"
  }
}
```

Сохраните токен - можете использовать для API запросов!

---

## 🧪 Проверка Установки

### 1. Проверьте Backend Health

```bash
curl http://localhost:5000/health
```

**Ожидаемый ответ:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-23T...",
  "uptime": 123,
  "environment": "development"
}
```

### 2. Проверьте БД Connection

```bash
curl http://localhost:5000/api/health
```

**Ожидаемый ответ:**
```json
{
  "status": "healthy",
  "checks": {
    "server": "ok",
    "database": "ok"
  },
  "timestamp": "..."
}
```

### 3. Проверьте Frontend

Откройте http://localhost:5173 - должна появиться landing page.

### 4. Запустите Тесты Аутентификации

```bash
# Unit тесты
npx tsx scripts/test-auth.ts

# API тесты (требуется запущенный сервер)
./scripts/test-auth-api.sh
```

---

## 📁 Структура Проекта

```
StockMind/
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/    # UI компоненты
│   │   ├── pages/         # Страницы
│   │   ├── lib/           # Утилиты (auth, API client)
│   │   └── hooks/         # React hooks
│   └── index.html
├── server/                # Backend (Express)
│   ├── routes/           # API маршруты
│   ├── middleware/       # Middleware (auth, security)
│   ├── lib/              # Библиотеки (JWT, logging)
│   └── index.ts          # Entry point
├── shared/               # Общие типы и схемы
│   └── schema/          # Drizzle ORM схемы
├── scripts/             # Утилиты и тесты
├── .env.example         # Пример environment variables
└── package.json
```

---

## 🔧 Полезные Команды

### Разработка

```bash
npm run dev              # Запустить dev сервер (frontend + backend)
npm run dev:client       # Только frontend
npm run dev:server       # Только backend
```

### База Данных

```bash
npm run db:push          # Применить схему к БД (миграция)
npm run db:studio        # Открыть Drizzle Studio (GUI для БД)
npm run db:generate      # Сгенерировать миграции
```

### Тестирование

```bash
npx tsx scripts/test-auth.ts           # Unit тесты JWT
./scripts/test-auth-api.sh             # API тесты
```

### Production Build

```bash
npm run build            # Собрать проект
npm start               # Запустить production build
```

### Docker (Управление БД)

```bash
# Остановить PostgreSQL
docker stop stockmind-postgres

# Запустить снова
docker start stockmind-postgres

# Удалить контейнер (ВНИМАНИЕ: потеряете данные!)
docker rm -f stockmind-postgres

# Посмотреть логи
docker logs stockmind-postgres

# Войти в psql
docker exec -it stockmind-postgres psql -U stockmind -d stockmind
```

---

## 🐛 Troubleshooting

### Проблема 1: "MODULE_NOT_FOUND" или "Cannot find module"

**Решение:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Проблема 2: "DATABASE_URL must be set"

**Решение:**
Убедитесь, что файл `.env` существует и содержит `DATABASE_URL`:
```bash
cat .env | grep DATABASE_URL
```

### Проблема 3: "Port 5432 already in use"

**Решение:**
У вас уже запущен PostgreSQL. Используйте существующий:
```bash
# Проверьте статус
sudo systemctl status postgresql

# Или используйте другой порт в Docker:
docker run -d -p 5433:5432 ...
# И обновите DATABASE_URL:
# DATABASE_URL=postgresql://...@localhost:5433/stockmind
```

### Проблема 4: "JWT_SECRET environment variable is required"

**Решение:**
Добавьте секреты в `.env`:
```bash
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
```

### Проблема 5: "relation 'users' does not exist"

**Решение:**
Примените миграцию:
```bash
npm run db:push
```

### Проблема 6: "password authentication failed"

**Решение:**
Проверьте пароль в `DATABASE_URL` и убедитесь, что пользователь создан:
```bash
sudo -u postgres psql
\du  # Список пользователей
\l   # Список баз данных
```

### Проблема 7: "EADDRINUSE: address already in use :::5000"

**Решение:**
Порт 5000 занят. Измените в `.env`:
```bash
PORT=5001
```

### Проблема 8: Frontend не подключается к Backend

**Решение:**
Проверьте CORS и убедитесь, что в development режиме:
```bash
# .env должен содержать:
NODE_ENV=development

# CORS автоматически разрешает localhost в dev режиме
# Проверьте в server/middleware/security.ts:26-28
```

---

## 🔄 Переключение между Neon и Local PostgreSQL

### Сейчас Используется:
- **Neon PostgreSQL** (serverless, облачная БД)
- Подключение через `@neondatabase/serverless`
- WebSocket соединение

### Хотите Использовать Обычный PostgreSQL?

**Хорошая новость:** Код уже поддерживает! Просто измените `DATABASE_URL`:

```bash
# Neon PostgreSQL (облачная)
DATABASE_URL=postgresql://user:password@ep-xyz.neon.tech/stockmind?sslmode=require

# Локальный PostgreSQL
DATABASE_URL=postgresql://stockmind:password@localhost:5432/stockmind
```

Neon adapter автоматически работает с обычным PostgreSQL через стандартный connection string.

---

## 📊 Опциональные Настройки

### Настройка Instagram Business API

Если хотите использовать Instagram аналитику:

1. Создайте Facebook App: https://developers.facebook.com/apps/
2. Добавьте Instagram Basic Display API
3. Получите App ID и App Secret
4. Добавьте в `.env`:
```bash
FB_APP_ID=your_app_id
FB_APP_SECRET=your_app_secret
```

### Настройка Sentry (Мониторинг Ошибок)

1. Создайте аккаунт: https://sentry.io/
2. Создайте новый проект
3. Получите DSN
4. Добавьте в `.env`:
```bash
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

### Настройка AI API Keys

API ключи управляются через Settings UI после входа:
1. Войдите в приложение
2. Откройте Settings
3. Добавьте нужные API ключи:
   - OpenAI
   - Anthropic (Claude)
   - ElevenLabs
   - HeyGen
   - Apify
   - KieAI

Ключи шифруются и хранятся в БД.

---

## 🎓 Обучение и Документация

### Основные Файлы Документации

- **LOCAL_SETUP.md** (этот файл) - Локальная установка
- **INDEPENDENT_DEPLOYMENT.md** - Деплой на production
- **AUTH_VERIFICATION_REPORT.md** - Проверка аутентификации
- **PRODUCTION_HARDENING_COMPLETE.md** - Production features
- **.env.example** - Пример конфигурации

### API Документация

После запуска сервера доступны endpoints:

**Authentication:**
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `GET /api/auth/me` - Текущий пользователь (требует токен)

**Health Checks:**
- `GET /health` - Простой health check
- `GET /api/health` - Детальный health check (БД, memory)

**Protected Endpoints:** (требуют `Authorization: Bearer <token>`)
- `GET /api/projects` - Список проектов
- `GET /api/settings/api-keys` - API ключи
- И другие...

---

## ✅ Checklist Локальной Установки

- [ ] PostgreSQL установлен или Docker запущен
- [ ] База данных `stockmind` создана
- [ ] `npm install` выполнен успешно
- [ ] `.env` файл создан с правильными значениями
- [ ] `SESSION_SECRET` и `JWT_SECRET` сгенерированы
- [ ] `npm run db:push` применил схему БД
- [ ] `npm run dev` запустил сервер
- [ ] Frontend открывается на http://localhost:5173
- [ ] Backend health check работает: http://localhost:5000/health
- [ ] Первый пользователь создан через `/login` или API
- [ ] Можете войти в систему

---

## 🆘 Нужна Помощь?

1. **Проверьте логи:**
   ```bash
   # Backend логи (в терминале где запущен npm run dev)
   # Frontend логи (в браузере Console)
   ```

2. **Запустите тесты:**
   ```bash
   npx tsx scripts/test-auth.ts
   ./scripts/test-auth-api.sh
   ```

3. **Проверьте БД:**
   ```bash
   npm run db:studio
   # Откроется Drizzle Studio на https://local.drizzle.studio
   ```

4. **Проверьте environment:**
   ```bash
   cat .env
   # Убедитесь, что все обязательные переменные заданы
   ```

---

## 🎉 Готово!

Ваш локальный StockMind запущен и готов к разработке! 🚀

**Следующие шаги:**
- Изучите код в `client/src` и `server/`
- Создайте тестовый проект
- Настройте AI API ключи в Settings
- Прочитайте `PRODUCTION_HARDENING_COMPLETE.md` для деталей

**Happy coding!** 💻
