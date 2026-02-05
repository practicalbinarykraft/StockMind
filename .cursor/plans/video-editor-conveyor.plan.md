---
name: Видео-редактор для конвейера
overview: Добавить видео-редактор с 4 отдельными страницами для генерации аудио (ElevenLabs), видео (HeyGen) и экспорта. Все файлы ≤500 строк (client) и ≤250 строк (server), логика в хуках/сервисах.
todos:
  - id: db-migration
    content: Создать таблицу scripts_media и миграцию БД
    status: pending
  - id: backend-module
    content: Создать модуль scripts-media (Entity ≤200, Service ≤250, Controller ≤150)
    status: pending
  - id: router-setup
    content: Добавить 4 роута для видео-редактора
    status: pending
  - id: main-page
    content: Создать VideoEditorMain с модулями (≤200 строк)
    status: pending
  - id: audio-page
    content: Создать VideoEditorAudio с модулями (≤250 строк)
    status: pending
  - id: avatar-page
    content: Создать VideoEditorAvatar с модулями (≤300 строк)
    status: pending
  - id: export-page
    content: Создать VideoEditorExport с модулями (≤200 строк)
    status: pending
  - id: hooks-audio
    content: Создать хуки для аудио (≤200 строк каждый)
    status: pending
  - id: hooks-video
    content: Создать хуки для видео (≤250 строк каждый)
    status: pending
  - id: media-service
    content: Создать scriptMediaService (≤200 строк)
    status: pending
  - id: scripts-page-button
    content: Добавить кнопку на ScriptsPage с индикаторами
    status: pending
  - id: tests-frontend
    content: Unit тесты для всех страниц и компонентов
    status: pending
  - id: tests-backend
    content: Тесты для API scripts-media
    status: pending
  - id: e2e-tests
    content: E2E тест полного flow
    status: pending
isProject: false
---

# Видео-редактор для конвейера

## 📋 Ключевые требования

### 🚫 Запреты и ограничения

**Frontend:**

- ❌ Модальные окна → ✅ Отдельные страницы
- ❌ Файлы > 500 строк → ✅ Разбивать на модули
- ❌ UI + API в одном файле → ✅ Логика в хуках/сервисах
- ❌ Прямые fetch в компонентах → ✅ Только через сервисы

**Backend:**

- ❌ Controller > 150 строк → ✅ Разбить на методы
- ❌ Service > 250 строк → ✅ Создать подсервисы
- ❌ Бизнес-логика в Controller → ✅ Только в Service
- ❌ SQL в Service → ✅ Только в Repository (если нужен)

---

## 🗄️ 1. База данных

### Таблица scripts_media (one-to-one с scripts_library)

```sql
CREATE TABLE scripts_media (
  id UUID PRIMARY KEY,
  scriptId UUID UNIQUE NOT NULL REFERENCES scripts_library(id) ON DELETE CASCADE,
  
  -- Аудио
  audioUrl VARCHAR,
  audioMode VARCHAR CHECK (audioMode IN ('generate', 'upload', 'record')),
  selectedVoice VARCHAR,
  audioFilename VARCHAR,
  audioFilesize INTEGER,
  audioGeneratedAt TIMESTAMP,
  
  -- Видео
  videoUrl VARCHAR,
  videoId VARCHAR,
  selectedAvatar VARCHAR,
  videoDuration FLOAT,
  videoStatus VARCHAR CHECK (videoStatus IN ('generating', 'completed', 'failed')),
  videoThumbnailUrl VARCHAR,
  videoGeneratedAt TIMESTAMP,
  videoErrorMessage TEXT,
  
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scripts_media_script_id ON scripts_media(scriptId);
```

### Файлы backend (соблюдая лимиты)

**Миграция:**

- `server/db/migrations/XXXX_create_scripts_media_table.ts` (≤100 строк)

**Entity (≤200 строк):**

- `server/modules/scripts-media/scripts-media.entity.ts`

**DTO (≤200 строк, можно разбить):**

- `server/modules/scripts-media/dto/create-script-media.dto.ts` (≤80 строк)
- `server/modules/scripts-media/dto/update-script-media.dto.ts` (≤80 строк)
- `server/modules/scripts-media/dto/update-audio.dto.ts` (≤40 строк)
- `server/modules/scripts-media/dto/update-video.dto.ts` (≤50 строк)

**Controller (≤150 строк):**

- `server/modules/scripts-media/scripts-media.controller.ts`

**Service (≤250 строк):**

- `server/modules/scripts-media/scripts-media.service.ts`

**Module:**

- `server/modules/scripts-media/scripts-media.module.ts` (≤50 строк)

**Routes:**

- `server/modules/scripts-media/scripts-media.routes.ts` (≤80 строк)

**Shared schema:**

- `shared/schema/scripts-media.ts` (≤150 строк)

---

## 🎨 2. Frontend - Архитектура страниц

### Роутинг (4 отдельные страницы)

```typescript
// client/src/app/router.tsx

// Главная страница редактора
<Route path="/conveyor/video-editor/:id">
  {() => <PrivateRoute component={VideoEditorMain} />}
</Route>

// Страница генерации аудио
<Route path="/conveyor/video-editor/:id/audio">
  {() => <PrivateRoute component={VideoEditorAudio} />}
</Route>

// Страница выбора аватара
<Route path="/conveyor/video-editor/:id/avatar">
  {() => <PrivateRoute component={VideoEditorAvatar} />}
</Route>

// Страница экспорта
<Route path="/conveyor/video-editor/:id/export">
  {() => <PrivateRoute component={VideoEditorExport} />}
</Route>
```

### Навигация между страницами

```
ScriptsPage → [Кнопка "Видео-редактор"]
    ↓
VideoEditorMain (/conveyor/video-editor/:id)
    ├─→ [Кнопка "Аудио"] → VideoEditorAudio
    ├─→ [Кнопка "Аватар"] → VideoEditorAvatar
    └─→ [Кнопка "Экспорт"] → VideoEditorExport

Каждая страница имеет кнопку "Назад" → VideoEditorMain
```

---

## 📄 3. Страница VideoEditorMain (Главная)

**Путь:** `/conveyor/video-editor/:id`

**Назначение:** Обзор сценария, статус медиа, навигация к генерации

### Структура компонентов (≤400 строк total)

```
VideoEditorMain (≤200 строк)
├── VideoEditorHeader (≤100 строк)
│   ├── Кнопка "Назад" → /conveyor/scripts
│   ├── Название сценария
│   └── Кнопка "Редактировать текст" → /conveyor/editor/:id
├── VideoEditorPreview (≤150 строк)
│   ├── Превью видео (если есть)
│   ├── Плейсхолдер (если нет)
│   └── Плеер видео с контролами
├── VideoEditorActions (≤100 строк)
│   ├── Кнопка "Сгенерировать аудио" → /audio
│   ├── Кнопка "Выбрать аватар" → /avatar
│   └── Кнопка "Экспорт" → /export
└── VideoEditorSidebar (≤150 строк)
    ├── MediaStatusBadges (≤80 строк)
    │   ├── Аудио: ✓ / ✗
    │   └── Видео: ✓ / generating / ✗
    └── ScenesList (≤100 строк)
        └── SceneCard[] - список сцен
```

### Файлы (соблюдая ≤500 строк)

**Роут-обёртка:**

- `client/src/pages/conveyor/video-editor.tsx` (≤50 строк)

**Главный компонент:**

- `client/src/features/conveyor/components/VideoEditorMain.tsx` (≤200 строк)

**Подкомпоненты:**

- `client/src/features/conveyor/components/video-editor/VideoEditorHeader.tsx` (≤100 строк)
- `client/src/features/conveyor/components/video-editor/VideoEditorPreview.tsx` (≤150 строк)
- `client/src/features/conveyor/components/video-editor/VideoEditorActions.tsx` (≤100 строк)
- `client/src/features/conveyor/components/video-editor/VideoEditorSidebar.tsx` (≤150 строк)
- `client/src/features/conveyor/components/video-editor/MediaStatusBadges.tsx` (≤80 строк)
- `client/src/features/conveyor/components/video-editor/ScenesList.tsx` (≤100 строк)
- `client/src/features/conveyor/components/video-editor/SceneCard.tsx` (≤60 строк)

**Хук (логика):**

- `client/src/features/conveyor/hooks/use-video-editor-data.ts` (≤200 строк)
  - Загрузка данных скрипта
  - Загрузка медиа-статуса
  - Синхронизация с сервером

---

## 🎤 4. Страница VideoEditorAudio (Генерация аудио)

**Путь:** `/conveyor/video-editor/:id/audio`

**Назначение:** Генерация/загрузка/запись аудио

### Структура компонентов (≤450 строк total)

```
VideoEditorAudio (≤250 строк)
├── AudioPageHeader (≤80 строк)
│   ├── Кнопка "Назад" → /video-editor/:id
│   └── Заголовок "Генерация аудио"
├── AudioTabs (≤150 строк) - TabsList + TabsContent
│   ├── Tab: Generate (≤150 строк)
│   │   ├── VoiceSelector (из Stage4)
│   │   ├── GenerateButton
│   │   └── AudioPlayer (из Stage4)
│   ├── Tab: Upload (≤80 строк)
│   │   ├── AudioUploader (из Stage4)
│   │   └── AudioPlayer
│   └── Tab: Record (≤100 строк)
│       ├── VoiceRecorder (новый)
│       └── AudioPlayer
└── AudioPageFooter (≤70 строк)
    ├── Статус: "Аудио сохранено ✓"
    └── Кнопка "Готово" → /video-editor/:id
```

### Файлы (≤500 строк каждый)

**Роут:**

- `client/src/pages/conveyor/video-editor-audio.tsx` (≤50 строк)

**Главный компонент:**

- `client/src/features/conveyor/components/VideoEditorAudio.tsx` (≤250 строк)

**Подкомпоненты:**

- `client/src/features/conveyor/components/video-editor/audio/AudioPageHeader.tsx` (≤80 строк)
- `client/src/features/conveyor/components/video-editor/audio/AudioTabs.tsx` (≤150 строк)
- `client/src/features/conveyor/components/video-editor/audio/AudioGenerateTab.tsx` (≤150 строк)
- `client/src/features/conveyor/components/video-editor/audio/AudioUploadTab.tsx` (≤80 строк)
- `client/src/features/conveyor/components/video-editor/audio/AudioRecordTab.tsx` (≤100 строк)
- `client/src/features/conveyor/components/video-editor/audio/VoiceRecorder.tsx` (≤150 строк)
- `client/src/features/conveyor/components/video-editor/audio/AudioPageFooter.tsx` (≤70 строк)

**Хуки (логика вынесена):**

- `client/src/features/conveyor/hooks/use-audio-generation.ts` (≤200 строк)
  - Генерация через ElevenLabs
  - Сохранение в scripts_media
- `client/src/features/conveyor/hooks/use-audio-upload.ts` (≤150 строк)
  - Загрузка файла
  - Upload на сервер
- `client/src/features/conveyor/hooks/use-voice-recording.ts` (≤200 строк)
  - MediaRecorder API
  - Визуализация записи
  - Сохранение записи

**Переиспользование из Stage4:**

- `VoiceSelector` → импорт + адаптация стилей
- `AudioPlayer` → импорт + адаптация стилей
- `AudioUploader` → импорт + адаптация стилей

---

## 👤 5. Страница VideoEditorAvatar (Выбор аватара)

**Путь:** `/conveyor/video-editor/:id/avatar`

**Назначение:** Выбор аватара + генерация видео HeyGen

### Структура компонентов (≤450 строк total)

```
VideoEditorAvatar (≤300 строк)
├── AvatarPageHeader (≤80 строк)
│   ├── Кнопка "Назад"
│   └── Заголовок
├── AvatarSearch (≤100 строк)
│   ├── Поиск по имени
│   └── Кнопка "Обновить"
├── AvatarGrid (≤200 строк)
│   ├── AvatarCard[] (≤80 строк)
│   │   ├── Изображение
│   │   ├── Название
│   │   ├── Кнопка "Превью"
│   │   └── Индикация выбора
│   └── AvatarPagination (≤50 строк)
├── VideoGenerationSection (≤150 строк)
│   ├── Кнопка "Сгенерировать"
│   ├── VideoProgressBar (≤80 строк)
│   └── VideoPlayer (результат)
└── AvatarPageFooter (≤70 строк)
```

### Файлы (≤500 строк каждый)

**Роут:**

- `client/src/pages/conveyor/video-editor-avatar.tsx` (≤50 строк)

**Главный:**

- `client/src/features/conveyor/components/VideoEditorAvatar.tsx` (≤300 строк)

**Подкомпоненты:**

- `client/src/features/conveyor/components/video-editor/avatar/AvatarPageHeader.tsx` (≤80)
- `client/src/features/conveyor/components/video-editor/avatar/AvatarSearch.tsx` (≤100)
- `client/src/features/conveyor/components/video-editor/avatar/AvatarGrid.tsx` (≤200)
- `client/src/features/conveyor/components/video-editor/avatar/AvatarCard.tsx` (≤80)
- `client/src/features/conveyor/components/video-editor/avatar/AvatarPagination.tsx` (≤50)
- `client/src/features/conveyor/components/video-editor/avatar/VideoGenerationSection.tsx` (≤150)
- `client/src/features/conveyor/components/video-editor/avatar/VideoProgressBar.tsx` (≤80)
- `client/src/features/conveyor/components/video-editor/avatar/AvatarPageFooter.tsx` (≤70)

**Хуки:**

- `client/src/features/conveyor/hooks/use-avatar-selection.ts` (≤200 строк)
- `client/src/features/conveyor/hooks/use-video-generation.ts` (≤250 строк)
- `client/src/features/conveyor/hooks/use-video-polling.ts` (≤150 строк)

**Переиспользование:**

- `useAvatarImages` из Stage5
- `useProxiedVideo` из Stage5

---

## 📥 6. Страница VideoEditorExport (Экспорт)

**Путь:** `/conveyor/video-editor/:id/export`

**Назначение:** Скачивание аудио и видео

### Структура (≤350 строк total)

```
VideoEditorExport (≤200 строк)
├── ExportPageHeader (≤80 строк)
├── ExportAudioSection (≤120 строк)
│   ├── MediaInfoCard (≤80 строк)
│   ├── AudioPlayer
│   └── DownloadButton (≤60 строк)
├── ExportVideoSection (≤150 строк)
│   ├── MediaInfoCard
│   ├── VideoPlayer
│   └── DownloadButton
└── ExportPageFooter (≤70 строк)
```

### Файлы (≤500 строк)

**Роут:**

- `client/src/pages/conveyor/video-editor-export.tsx` (≤50)

**Главный:**

- `client/src/features/conveyor/components/VideoEditorExport.tsx` (≤200)

**Подкомпоненты:**

- `.../export/ExportPageHeader.tsx` (≤80)
- `.../export/ExportAudioSection.tsx` (≤120)
- `.../export/ExportVideoSection.tsx` (≤150)
- `.../export/MediaInfoCard.tsx` (≤80)
- `.../export/DownloadButton.tsx` (≤60)
- `.../export/ExportPageFooter.tsx` (≤70)

**Хуки:**

- `use-media-export.ts` (≤150 строк)
- `use-media-download.ts` (≤100 строк)

---

## 🔌 7. Backend API

### Endpoints (scripts-media)

```typescript
GET    /api/scripts/:scriptId/media          // Получить медиа
PUT    /api/scripts/:scriptId/media          // Upsert медиа
PATCH  /api/scripts/:scriptId/media/audio    // Обновить аудио
PATCH  /api/scripts/:scriptId/media/video    // Обновить видео
GET    /api/scripts/:scriptId/media/status   // Краткий статус
DELETE /api/scripts/:scriptId/media          // Удалить
```

### Controller (≤150 строк)

```typescript
// server/modules/scripts-media/scripts-media.controller.ts

@Controller('scripts/:scriptId/media')
export class ScriptsMediaController {
  
  @Get()
  async getMedia(@Param('scriptId') scriptId: string) {
    return this.service.findByScriptId(scriptId)
  }
  
  @Put()
  async upsertMedia(@Param('scriptId') id, @Body() dto: UpdateScriptMediaDto) {
    return this.service.upsert(id, dto)
  }
  
  @Patch('audio')
  async updateAudio(@Param('scriptId') id, @Body() dto: UpdateAudioDto) {
    return this.service.updateAudio(id, dto)
  }
  
  // ... остальные методы (≤10 строк каждый)
}
```

### Service (≤250 строк)

```typescript
// server/modules/scripts-media/scripts-media.service.ts

@Injectable()
export class ScriptsMediaService {
  
  async findByScriptId(scriptId: string) {
    // Получение медиа (≤20 строк)
  }
  
  async upsert(scriptId: string, data: UpdateScriptMediaDto) {
    // Upsert логика (≤40 строк)
  }
  
  async updateAudio(scriptId: string, data: UpdateAudioDto) {
    // Обновление только аудио (≤30 строк)
  }
  
  async updateVideo(scriptId: string, data: UpdateVideoDto) {
    // Обновление только видео (≤30 строк)
  }
  
  async getStatus(scriptId: string) {
    // Краткий статус (≤20 строк)
  }
  
  // ... вспомогательные методы
}
```

---

## 🎣 8. Frontend Сервисы

### scriptMediaService.ts (≤200 строк)

```typescript
// client/src/features/conveyor/services/scriptMediaService.ts

import { apiRequest } from '@/shared/api/http'

export const scriptMediaService = {
  
  async getMedia(scriptId: string) {
    const res = await apiRequest('GET', `/api/scripts/${scriptId}/media`)
    return res.json()
  }
  
  async upsertMedia(scriptId: string, data: Partial<ScriptMedia>) {
    const res = await apiRequest('PUT', `/api/scripts/${scriptId}/media`, data)
    return res.json()
  }
  
  async updateAudio(scriptId: string, audioData: AudioData) {
    const res = await apiRequest('PATCH', `/api/scripts/${scriptId}/media/audio`, audioData)
    return res.json()
  }
  
  async updateVideo(scriptId: string, videoData: VideoData) {
    const res = await apiRequest('PATCH', `/api/scripts/${scriptId}/media/video`, videoData)
    return res.json()
  }
  
  async getStatus(scriptId: string) {
    const res = await apiRequest('GET', `/api/scripts/${scriptId}/media/status`)
    return res.json()
  }
  
  async deleteMedia(scriptId: string) {
    await apiRequest('DELETE', `/api/scripts/${scriptId}/media`)
  }
}
```

---

## ✅ Критерии успеха

**Функциональные:**

1. ✅ 4 отдельные страницы работают
2. ✅ Навигация между страницами
3. ✅ Генерация аудио (3 режима)
4. ✅ Генерация видео (polling)
5. ✅ Экспорт аудио/видео
6. ✅ Данные сохраняются в scripts_media
7. ✅ После перезагрузки данные восстанавливаются

**Качество кода:**

1. ✅ Все файлы ≤500 строк (client)
2. ✅ Все файлы ≤250 строк (server)
3. ✅ Логика в хуках/сервисах
4. ✅ UI компоненты чистые
5. ✅ Нет прямых fetch в компонентах
6. ✅ Модульная структура

**Тесты:**

1. ✅ Unit тесты для компонентов
2. ✅ Тесты для API
3. ✅ E2E тест flow

---

## 📁 Файлы для создания

### Backend (≤250 строк)

**Миграция:**

- `server/db/migrations/XXXX_create_scripts_media_table.ts` (≤100)

**Entity:**

- `server/modules/scripts-media/scripts-media.entity.ts` (≤200)

**DTO (разбиты):**

- `server/modules/scripts-media/dto/create-script-media.dto.ts` (≤80)
- `server/modules/scripts-media/dto/update-script-media.dto.ts` (≤80)
- `server/modules/scripts-media/dto/update-audio.dto.ts` (≤40)
- `server/modules/scripts-media/dto/update-video.dto.ts` (≤50)

**Controller:**

- `server/modules/scripts-media/scripts-media.controller.ts` (≤150)

**Service:**

- `server/modules/scripts-media/scripts-media.service.ts` (≤250)

**Module:**

- `server/modules/scripts-media/scripts-media.module.ts` (≤50)

**Routes:**

- `server/modules/scripts-media/scripts-media.routes.ts` (≤80)

**Schema:**

- `shared/schema/scripts-media.ts` (≤150)

### Frontend (≤500 строк)

**Роуты (≤50):**

- `client/src/pages/conveyor/video-editor.tsx`
- `client/src/pages/conveyor/video-editor-audio.tsx`
- `client/src/pages/conveyor/video-editor-avatar.tsx`
- `client/src/pages/conveyor/video-editor-export.tsx`

**Главные (≤300):**

- `client/src/features/conveyor/components/VideoEditorMain.tsx` (≤200)
- `client/src/features/conveyor/components/VideoEditorAudio.tsx` (≤250)
- `client/src/features/conveyor/components/VideoEditorAvatar.tsx` (≤300)
- `client/src/features/conveyor/components/VideoEditorExport.tsx` (≤200)

**Модули Main (≤150):**

- `.../video-editor/VideoEditorHeader.tsx` (≤100)
- `.../video-editor/VideoEditorPreview.tsx` (≤150)
- `.../video-editor/VideoEditorActions.tsx` (≤100)
- `.../video-editor/VideoEditorSidebar.tsx` (≤150)
- `.../video-editor/MediaStatusBadges.tsx` (≤80)
- `.../video-editor/ScenesList.tsx` (≤100)
- `.../video-editor/SceneCard.tsx` (≤60)

**Модули Audio (≤150):**

- `.../audio/AudioPageHeader.tsx` (≤80)
- `.../audio/AudioTabs.tsx` (≤150)
- `.../audio/AudioGenerateTab.tsx` (≤150)
- `.../audio/AudioUploadTab.tsx` (≤80)
- `.../audio/AudioRecordTab.tsx` (≤100)
- `.../audio/VoiceRecorder.tsx` (≤150)
- `.../audio/AudioPageFooter.tsx` (≤70)

**Модули Avatar (≤200):**

- `.../avatar/AvatarPageHeader.tsx` (≤80)
- `.../avatar/AvatarSearch.tsx` (≤100)
- `.../avatar/AvatarGrid.tsx` (≤200)
- `.../avatar/AvatarCard.tsx` (≤80)
- `.../avatar/AvatarPagination.tsx` (≤50)
- `.../avatar/VideoGenerationSection.tsx` (≤150)
- `.../avatar/VideoProgressBar.tsx` (≤80)
- `.../avatar/AvatarPageFooter.tsx` (≤70)

**Модули Export (≤150):**

- `.../export/ExportPageHeader.tsx` (≤80)
- `.../export/ExportAudioSection.tsx` (≤120)
- `.../export/ExportVideoSection.tsx` (≤150)
- `.../export/MediaInfoCard.tsx` (≤80)
- `.../export/DownloadButton.tsx` (≤60)
- `.../export/ExportPageFooter.tsx` (≤70)

**Хуки (≤250):**

- `hooks/use-video-editor-data.ts` (≤200)
- `hooks/use-audio-generation.ts` (≤200)
- `hooks/use-audio-upload.ts` (≤150)
- `hooks/use-voice-recording.ts` (≤200)
- `hooks/use-avatar-selection.ts` (≤200)
- `hooks/use-video-generation.ts` (≤250)
- `hooks/use-video-polling.ts` (≤150)
- `hooks/use-media-export.ts` (≤150)
- `hooks/use-media-download.ts` (≤100)

**Сервис:**

- `services/scriptMediaService.ts` (≤200)

**Типы:**

- `types.ts` - добавить ScriptMedia, ScriptMediaStatus

### Изменить

- `client/src/app/router.tsx` - 4 новых роута
- `client/src/features/conveyor/components/ScriptsPage.tsx` - кнопка + бейджи
- `server/app.ts` - зарегистрировать scripts-media module

---

## 📋 План выполнения

### Этап 1: Backend (≤250 строк на файл)

1. Миграция БД scripts_media
2. Entity (≤200 строк)
3. DTO (4 файла по ≤80 строк)
4. Service (≤250 строк, разбить если больше)
5. Controller (≤150 строк)
6. Module + Routes
7. Тесты API

### Этап 2: Frontend Main (≤500 строк на файл)

1. 4 роута в router.tsx
2. VideoEditorMain + модули (7 файлов)
3. Хук use-video-editor-data.ts
4. Кнопка на ScriptsPage

### Этап 3: Frontend Audio

1. VideoEditorAudio + модули (7 файлов)
2. Хуки: audio-generation, audio-upload, voice-recording
3. Интеграция с ElevenLabs

### Этап 4: Frontend Avatar

1. VideoEditorAvatar + модули (8 файлов)
2. Хуки: avatar-selection, video-generation, video-polling
3. Интеграция с HeyGen

### Этап 5: Frontend Export

1. VideoEditorExport + модули (6 файлов)
2. Хуки: media-export, media-download

### Этап 6: Тесты

1. Unit тесты компонентов
2. Unit тесты хуков
3. E2E тест flow

### Этап 7: Полировка

1. Адаптация дизайна
2. Loading states
3. Обработка ошибок
4. Финальное тестирование

