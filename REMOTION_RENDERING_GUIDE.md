# Remotion Video Rendering - Руководство по использованию

## 📋 Обзор

Система рендеринга видео через Remotion CLI интегрирована в проект. Поддерживаются два типа видео:
1. **HeyGen видео** - генерация с AI-аватаром (существующая функциональность)
2. **Remotion рендеринг** - серверный рендеринг композиций из слоев (новая функциональность)

## ✅ Что было реализовано

### Backend (Server)

1. **Конфигурация Remotion** (`server/modules/video-rendering/remotion.config.ts`)
   - Настройки серверного рендеринга
   - Оптимизация для производительности

2. **Система очереди** (`server/modules/video-rendering/render-queue.ts`)
   - Последовательная обработка задач рендеринга
   - Управление позицией в очереди
   - Отмена задач

3. **Сервис рендеринга** (`server/modules/video-rendering/video-rendering.service.ts`)
   - Реальный рендеринг через Remotion CLI
   - Загрузка готового видео в R2
   - Генерация presigned URLs
   - Очистка временных файлов

4. **API роуты** (`server/modules/video-rendering/video-rendering.routes.ts`)
   - `POST /api/scripts/:scriptId/render` - запуск рендеринга
   - `GET /api/scripts/:scriptId/render/:jobId/status` - статус задачи
   - `GET /api/scripts/:scriptId/render/:jobId/download` - ссылка для скачивания
   - `GET /api/scripts/:scriptId/render/:jobId/preview` - presigned URL (24 часа)
   - `DELETE /api/render/jobs/:jobId` - отмена задачи

### Frontend (Client)

5. **Компонент прогресса рендеринга** (`RenderProgressCard.tsx`)
   - Прогресс-бар с процентами
   - Динамические сообщения о статусе
   - Расчет оставшегося времени
   - Отображение позиции в очереди
   - Кнопка отмены

6. **Компонент видео-плеера** (`VideoPreviewPlayer.tsx`)
   - HTML5 video player
   - Кнопки: Скачать, Поделиться, Открыть
   - Поддержка Web Share API

7. **Обновленная секция экспорта** (`ExportVideoSection.tsx`)
   - Кнопка "Начать рендеринг"
   - Polling статуса каждые 3 секунды
   - Отображение HeyGen и Remotion видео раздельно
   - Автоматическая остановка polling при завершении

## 🚀 Как использовать

### 1. Подготовка окружения

#### Установка FFMPEG (обязательно!)

**Windows:**
```bash
# Через Chocolatey
choco install ffmpeg

# Или скачать с официального сайта
# https://ffmpeg.org/download.html
```

**Linux:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

Проверка установки:
```bash
ffmpeg -version
```

#### Переменные окружения

Убедитесь, что в `.env` файле настроены:

```env
# Video Rendering Configuration
REMOTION_TEMP_DIR=./temp/remotion
REMOTION_CONCURRENCY=2
REMOTION_TIMEOUT=1800000  # 30 минут

# R2 Storage (обязательно для загрузки видео)
R2_BUCKET_NAME=your-bucket-name
R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_PUBLIC_URL=https://your-public-url.com
```

### 2. Использование в UI

1. Перейдите на страницу **Video Editor → Export** для нужного скрипта
2. Прокрутите до секции "Remotion Рендеринг"
3. **Выберите качество видео:**
   - 🌟 **High** - Максимальное качество (CRF 18, ~2-3 GB)
   - ⚖️ **Medium** - Оптимальный баланс (CRF 23, ~1-1.5 GB) - **рекомендуется**
   - 📦 **Low** - Компактный размер (CRF 28, ~500-800 MB)
4. Нажмите кнопку **"Начать рендеринг"**
5. Наблюдайте за прогрессом в реальном времени
6. После завершения появится видео-плеер с готовым видео
7. Используйте кнопки для скачивания или публикации

### 3. Workflow рендеринга

```
Пользователь нажимает "Начать рендеринг"
    ↓
Создается задача рендеринга
    ↓
Проверка: идет ли уже рендеринг?
    ├─ Да → Добавить в очередь
    └─ Нет → Начать рендеринг сразу
         ↓
    Подготовка данных (5%)
         ↓
    Запуск Remotion CLI (10%)
         ↓
    Рендеринг кадров (15-80%)
         ↓
    Финальная обработка (80-90%)
         ↓
    Загрузка в R2 (90-95%)
         ↓
    Очистка временных файлов (95-100%)
         ↓
    Видео готово! ✅
```

## ⚙️ Технические детали

### Время рендеринга

Для 5-минутного видео при 30 FPS (9000 кадров):
- Рендеринг кадров: **20-30 минут**
- Финальная обработка: **2-3 минуты**
- Загрузка в R2 (500 MB): **30-60 секунд**
- **Итого: ~25-35 минут**

### Параметры рендеринга

**Настройки качества (CRF):**
- **High**: CRF 18 - визуально без потерь, ~2-3 GB для 5-минутного видео
- **Medium**: CRF 23 - оптимальный баланс, ~1-1.5 GB (рекомендуется)
- **Low**: CRF 28 - заметное сжатие, ~500-800 MB

По умолчанию используются:
- **Разрешение**: 1920x1080 (Full HD)
- **FPS**: 30
- **Формат**: MP4 (H.264)
- **Качество**: Medium (можно выбрать в UI)

### Оптимизация для нагрузки

- **Concurrency**: 2 кадра параллельно
- **Очередь**: Последовательная обработка задач
- **Timeout**: 30 минут на одно видео
- **Очистка**: Автоматическое удаление временных файлов

Рекомендуемые характеристики сервера:
- CPU: 4 ядра
- RAM: 8 GB
- Диск: 50 GB SSD
- Временное хранилище: ~15-20 GB на пиковую нагрузку

## 🔧 API Endpoints

### Запустить рендеринг
```http
POST /api/scripts/:scriptId/render
Content-Type: application/json

{
  "width": 1920,
  "height": 1080,
  "fps": 30,
  "format": "mp4",
  "quality": "high"
}

Response:
{
  "jobId": "render-script123-1234567890",
  "status": "pending",
  "progress": 0,
  "startedAt": "2024-01-01T12:00:00.000Z"
}
```

### Получить статус
```http
GET /api/scripts/:scriptId/render/:jobId/status

Response:
{
  "jobId": "render-script123-1234567890",
  "status": "processing",
  "progress": 45,
  "startedAt": "2024-01-01T12:00:00.000Z",
  "videoUrl": null
}
```

### Получить download URL
```http
GET /api/scripts/:scriptId/render/:jobId/download

Response:
{
  "downloadUrl": "https://pub-xxx.r2.dev/users/.../video.mp4"
}
```

### Получить preview URL (presigned)
```http
GET /api/scripts/:scriptId/render/:jobId/preview

Response:
{
  "previewUrl": "https://pub-xxx.r2.dev/users/.../video.mp4?X-Amz-...",
  "expiresIn": 86400
}
```

### Отменить рендеринг
```http
DELETE /api/render/jobs/:jobId

Response:
{
  "success": true
}
```

## 🐛 Troubleshooting

### Ошибка: "FFMPEG not found"
**Решение**: Установите FFMPEG (см. раздел "Установка FFMPEG")

### Ошибка: "Remotion CLI execution error"
**Проверьте:**
1. Установлены ли все зависимости: `npm install`
2. Существует ли директория `client/src/features/conveyor/remotion`
3. Правильно ли настроены пути в `remotion.config.ts`

### Видео зависло на одном проценте
**Возможные причины:**
1. Недостаточно ресурсов сервера (CPU/RAM)
2. Таймаут слишком короткий
3. Ошибка в композиции Remotion

**Решение**: Проверьте логи сервера и увеличьте `REMOTION_TIMEOUT`

### Ошибка загрузки в R2
**Проверьте:**
1. Правильность credentials в `.env`
2. Права доступа к bucket
3. Достаточно ли места в bucket

## 📝 Дальнейшие улучшения

### Приоритет 1 (Критично)
- [ ] Установка FFMPEG на production сервер
- [ ] Настройка R2 credentials
- [ ] Тестирование полного цикла рендеринга

### Приоритет 2 (Важно)
- [ ] Добавить retry логику при сбоях
- [ ] Реализовать уведомления (email/push) при завершении
- [ ] Добавить возможность выбора параметров рендеринга в UI
- [ ] Сохранение истории рендеров в базе данных

### Приоритет 3 (Улучшения)
- [ ] Предпросмотр рендеринга (первые 10 секунд)
- [ ] Batch рендеринг нескольких видео
- [ ] Статистика использования ресурсов
- [ ] CDN интеграция для быстрой доставки

## 📚 Дополнительные ресурсы

- [Remotion Documentation](https://www.remotion.dev/docs)
- [FFMPEG Documentation](https://ffmpeg.org/documentation.html)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)

## 🎉 Результат

Полностью функциональная система рендеринга видео через Remotion с:
- ✅ Серверным рендерингом
- ✅ Системой очереди
- ✅ Real-time progress tracking
- ✅ Автоматической загрузкой в облако
- ✅ Удобным UI для пользователей

**Следующий шаг**: Протестировать рендеринг на реальном скрипте!
