---
name: Видеоредактор с композицией слоев
overview: Добавление полноценного видеоредактора с поддержкой многослойной композиции (background, overlay, textLayer), генерации контента через Kie.ai/HeyGen, drag & drop, split/overlay режимов и интерактивного предпросмотра на базе Remotion
todos:
  - id: db-schema-layers
    content: Создать схемы БД для слоев (scene-layers, background-layers, overlay-layers, text-layers, scene-compositions)
    status: pending
  - id: db-migrations
    content: Создать и применить Drizzle миграции для новых таблиц
    status: pending
  - id: backend-scene-layers-module
    content: Реализовать модуль scene-layers (repos, service, controller, routes)
    status: pending
  - id: backend-kie-ai-module
    content: Реализовать модуль kie-ai для генерации контента (image, video, i2v)
    status: pending
  - id: backend-audio-splitting
    content: Реализовать модуль audio-splitting для разделения аудио на сцены
    status: pending
  - id: backend-storage-updates
    content: Обновить storage модуль для поддержки структурированных путей в R2
    status: pending
  - id: backend-video-rendering
    content: Реализовать модуль video-rendering с Remotion Lambda
    status: pending
  - id: frontend-types-layers
    content: Создать TypeScript типы для слоев и композиций
    status: pending
  - id: frontend-composition-store
    content: Создать Zustand store для управления композицией и слоями
    status: pending
  - id: frontend-layers-service
    content: Создать API service и React Query хуки для работы со слоями
    status: pending
  - id: frontend-remotion-integration
    content: "Интегрировать Remotion: Root, SceneComposition, Player"
    status: pending
  - id: frontend-preview-component
    content: Создать компонент RemotionPreview с интерактивным предпросмотром
    status: pending
  - id: frontend-draggable-overlay
    content: Реализовать drag & drop для overlay элементов с @dnd-kit
    status: pending
  - id: frontend-toolbar
    content: Создать правую панель инструментов с вкладками (Визуалы, Текст, Аудио, Композиция)
    status: pending
  - id: frontend-generation-dialogs
    content: Создать UI для генерации контента через Kie.ai
    status: pending
  - id: frontend-text-layer-ui
    content: Реализовать UI для настройки текстового слоя
    status: pending
  - id: frontend-composition-ui
    content: Реализовать UI для переключения режимов композиции (overlay/split)
    status: pending
  - id: data-migration
    content: Создать скрипт миграции существующих данных в новую модель слоев
    status: pending
  - id: testing-backend
    content: Протестировать backend API (слои, генерация, рендеринг)
    status: pending
  - id: testing-frontend
    content: Протестировать UI (drag & drop, предпросмотр, генерация, композиция)
    status: pending
isProject: false
---

# План реализации видеоредактора с многослойной композицией

## Этап 1: Расширение схемы данных и модели сцен

### 1.1 Новые таблицы для слоев

**Создать таблицы в `shared/schema/`:**

- `**scene-layers.ts**` - базовая таблица для хранения слоев сцен
  - `id` (uuid, PK)
  - `sceneId` (FK → scripts_library.scenes[].id)
  - `scriptId` (FK → scripts_library.id)
  - `layerType` (enum: 'background', 'overlay', 'textLayer')
  - `order` (int) - z-index порядок слоя
  - `isVisible` (boolean)
  - `createdAt`, `updatedAt`
- `**scene-background-layers.ts**` - данные для фонового слоя
  - `id` (uuid, PK)
  - `layerId` (FK → scene_layers.id, unique)
  - `contentType` (enum: 'avatar', 'image', 'video')
  - `sourceUrl` (varchar) - URL контента в R2
  - `generationPrompt` (text) - промпт для генерации
  - `generationModel` (varchar) - Kie.ai model ID или 'heygen'
  - `generationStatus` (enum: 'pending', 'processing', 'ready', 'failed')
  - `generationJobId` (varchar) - ID задачи генерации
  - `dimensions` (jsonb) - `{width, height}`
  - `metadata` (jsonb) - дополнительные параметры
- `**scene-overlay-layers.ts**` - данные для overlay слоя
  - `id` (uuid, PK)
  - `layerId` (FK → scene_layers.id, unique)
  - `contentType` (enum: 'avatar', 'image', 'video')
  - `sourceUrl` (varchar)
  - `position` (jsonb) - `{x, y, width, height}` в процентах от canvas
  - `aspectLock` (boolean) - фиксация пропорций
  - `minSize` (jsonb) - `{width, height}` минимальные размеры
  - `maxSize` (jsonb) - `{width, height}` максимальные размеры
  - `rotation` (float) - угол поворота (пока не используется, но зарезервировать)
  - `generationPrompt` (text)
  - `generationModel` (varchar)
  - `generationStatus` (enum)
  - `generationJobId` (varchar)
  - `metadata` (jsonb)
- `**scene-text-layers.ts**` - данные для текстового слоя
  - `id` (uuid, PK)
  - `layerId` (FK → scene_layers.id, unique)
  - `text` (text) - текст слоя (может отличаться от основного текста сцены)
  - `mode` (enum: 'static', 'marquee') - статичный или бегущая строка
  - `position` (jsonb) - `{type: 'top'|'center'|'bottom'|'custom', x?, y?}`
  - `fontSize` (int) - размер шрифта
  - `fontFamily` (varchar) - семейство шрифта
  - `textColor` (varchar) - цвет текста (hex)
  - `textAlign` (enum: 'left', 'center', 'right')
  - `backgroundColor` (varchar) - цвет фона (hex, nullable)
  - `backgroundOpacity` (float) - прозрачность фона 0-1
  - `marqueeSpeed` (float) - скорость бегущей строки (px/sec)
  - `isVisible` (boolean)
- `**scene-compositions.ts**` - настройки композиции сцены
  - `id` (uuid, PK)
  - `sceneId` (varchar, unique) - ссылка на ID сцены из scripts_library.scenes
  - `scriptId` (FK → scripts_library.id)
  - `mode` (enum: 'overlay', 'split') - режим композиции
  - `splitRatio` (float) - пропорция разделения для split-режима (0-1, default 0.5)
  - `splitDirection` (enum: 'horizontal', 'vertical') - направление split
  - `splitOrder` (enum: 'background-first', 'overlay-first') - порядок слоев в split
  - `gridSnapping` (boolean) - привязка к сетке для drag & drop
  - `gridSize` (int) - размер сетки в px (default 10)

**Миграции:**

- Создать Drizzle миграции для всех новых таблиц
- Добавить индексы: `scene_layers(scriptId, sceneId)`, `scene_compositions(scriptId)`

### 1.2 Обновление существующих схем

`**scripts-library.ts`:**

- Расширить JSONB поле `scenes` для включения `sceneId` (уникальный ID каждой сцены)
- Добавить поле `editorVersion` (varchar) - версия редактора для миграций

`**scripts-media.ts`:**

- Добавить поле `compositionSettings` (jsonb) - глобальные настройки композиции проекта
- Добавить поле `backgroundMusicUrl` (varchar) - фоновая музыка для всего проекта
- Добавить поле `backgroundMusicVolume` (float) - громкость фоновой музыки

### 1.3 TypeScript типы

**Создать `client/src/features/conveyor/types/layers.ts`:**

```typescript
// Базовые типы слоев
export type LayerType = 'background' | 'overlay' | 'textLayer'
export type ContentType = 'avatar' | 'image' | 'video'
export type GenerationStatus = 'pending' | 'processing' | 'ready' | 'failed'
export type CompositionMode = 'overlay' | 'split'

export interface Position {
  x: number // 0-100 (%)
  y: number // 0-100 (%)
  width: number // 0-100 (%)
  height: number // 0-100 (%)
}

export interface TextPosition {
  type: 'top' | 'center' | 'bottom' | 'custom'
  x?: number
  y?: number
}

export interface SceneLayer {
  id: string
  sceneId: string
  scriptId: string
  layerType: LayerType
  order: number
  isVisible: boolean
}

export interface BackgroundLayer extends SceneLayer {
  layerType: 'background'
  contentType: ContentType
  sourceUrl?: string
  generationPrompt?: string
  generationModel?: string
  generationStatus?: GenerationStatus
  generationJobId?: string
  dimensions?: { width: number; height: number }
}

export interface OverlayLayer extends SceneLayer {
  layerType: 'overlay'
  contentType: ContentType
  sourceUrl?: string
  position: Position
  aspectLock: boolean
  minSize?: { width: number; height: number }
  maxSize?: { width: number; height: number }
  generationPrompt?: string
  generationModel?: string
  generationStatus?: GenerationStatus
  generationJobId?: string
}

export interface TextLayer extends SceneLayer {
  layerType: 'textLayer'
  text: string
  mode: 'static' | 'marquee'
  position: TextPosition
  fontSize: number
  fontFamily: string
  textColor: string
  textAlign: 'left' | 'center' | 'right'
  backgroundColor?: string
  backgroundOpacity: number
  marqueeSpeed: number
  isVisible: boolean
}

export interface SceneComposition {
  id: string
  sceneId: string
  scriptId: string
  mode: CompositionMode
  splitRatio: number // 0-1
  splitDirection: 'horizontal' | 'vertical'
  splitOrder: 'background-first' | 'overlay-first'
  gridSnapping: boolean
  gridSize: number
}

export interface EnhancedScene {
  id: string
  order: number
  text: string
  audioUrl?: string
  durationInFrames: number
  // Композиция и слои
  composition: SceneComposition
  layers: {
    background?: BackgroundLayer
    overlay?: OverlayLayer
    textLayer?: TextLayer
  }
}
```

---

## Этап 2: Backend - API для работы со слоями

### 2.1 Модуль scene-layers

**Создать `server/modules/scene-layers/`:**

`**scene-layers.repo.ts**` (≤200 строк):

- `getLayersBySceneId(sceneId: string)` - получить все слои сцены
- `getLayersByScriptId(scriptId: string)` - получить слои всех сцен скрипта
- `createLayer(data: InsertSceneLayer)` - создать слой
- `updateLayer(id: string, data: Partial<SceneLayer>)` - обновить слой
- `deleteLayer(id: string)` - удалить слой
- `deleteLayersBySceneId(sceneId: string)` - удалить все слои сцены

`**background-layers.repo.ts**` (≤200 строк):

- CRUD операции для `scene_background_layers`
- `getByLayerId(layerId: string)`
- `updateGenerationStatus(layerId, status, jobId?)`

`**overlay-layers.repo.ts**` (≤200 строк):

- CRUD операции для `scene_overlay_layers`
- `updatePosition(layerId, position: Position)`

`**text-layers.repo.ts**` (≤200 строк):

- CRUD операции для `scene_text_layers`

`**scene-compositions.repo.ts**` (≤200 строк):

- `getBySceneId(sceneId: string)`
- `createOrUpdate(sceneId, data: Partial<SceneComposition>)`

`**scene-layers.service.ts**` (≤250 строк):

- `getSceneWithLayers(sceneId: string)` - получить сцену со всеми слоями
- `getScriptWithLayers(scriptId: string)` - получить скрипт со всеми сценами и слоями
- `createDefaultLayers(sceneId: string, scriptId: string)` - создать дефолтные слои для новой сцены
- `updateLayerContent(layerId, contentType, sourceUrl)` - обновить контент слоя
- `updateCompositionMode(sceneId, mode: CompositionMode)` - переключить режим композиции
- `updateSplitSettings(sceneId, ratio, direction, order)` - настройки split-режима

`**scene-layers.controller.ts**` (≤150 строк):

- `GET /api/scripts/:scriptId/scenes/:sceneId/layers` - получить слои сцены
- `POST /api/scripts/:scriptId/scenes/:sceneId/layers` - создать слой
- `PATCH /api/scripts/:scriptId/layers/:layerId` - обновить слой
- `DELETE /api/scripts/:scriptId/layers/:layerId` - удалить слой
- `PATCH /api/scripts/:scriptId/scenes/:sceneId/composition` - обновить композицию

`**scene-layers.routes.ts`:**

- Регистрация роутов

### 2.2 Модуль kie-ai (генерация контента)

**Создать `server/modules/kie-ai/`:**

`**kie-ai.types.ts**` (≤200 строк):

```typescript
export type KieModel = 
  | 'flux-pro' 
  | 'nano-banana-pro' 
  | 'recraft-v3' 
  | 'flux-schnell' 
  | 'kling-ai-video' 
  | 'kling-ai-i2v'

export interface TextToImageRequest {
  prompt: string
  model: KieModel
  aspectRatio?: '16:9' | '9:16' | '1:1'
  numImages?: number
}

export interface TextToVideoRequest {
  prompt: string
  model: 'kling-ai-video'
  duration?: number // seconds
  aspectRatio?: '16:9' | '9:16'
}

export interface ImageToVideoRequest {
  imageUrl: string
  prompt?: string
  model: 'kling-ai-i2v'
  duration?: number
}

export interface GenerationJob {
  id: string
  type: 'image' | 'video'
  status: GenerationStatus
  resultUrl?: string
  errorMessage?: string
  createdAt: Date
  completedAt?: Date
}
```

`**kie-ai.service.ts**` (≤250 строк):

- `generateImage(request: TextToImageRequest)` - генерация изображения
- `generateVideo(request: TextToVideoRequest)` - генерация видео из текста
- `imageToVideo(request: ImageToVideoRequest)` - конвертация изображения в видео
- `checkJobStatus(jobId: string)` - проверка статуса генерации
- `saveToR2(buffer: Buffer, filename: string, userId: string, scriptId: string)` - сохранение в R2

`**kie-ai.controller.ts**` (≤150 строк):

- `POST /api/kie-ai/generate-image` - запуск генерации изображения
- `POST /api/kie-ai/generate-video` - запуск генерации видео
- `POST /api/kie-ai/image-to-video` - image-to-video
- `GET /api/kie-ai/jobs/:jobId/status` - статус генерации
- `POST /api/kie-ai/webhook` - webhook для асинхронных уведомлений (если Kie.ai поддерживает)

`**kie-ai.routes.ts`:**

- Регистрация роутов

### 2.3 Обновление модуля storage

`**server/modules/storage/storage.repo.ts`:**

- Добавить метод `uploadWithPath(buffer, path, contentType)` - загрузка с custom path
- Путь: `/users/{userId}/projects/{projectId}/scenes/{sceneId}/{layerType}/{timestamp}-{uuid}.ext`

### 2.4 Модуль audio-splitting (разделение аудио на сцены)

**Создать `server/modules/audio-splitting/`:**

`**audio-splitting.service.ts**` (≤250 строк):

- `splitAudioByScenes(audioUrl: string, scenes: Scene[])` - разделение аудио на части по временным меткам сцен
- Использовать библиотеку `fluent-ffmpeg` для нарезки аудио
- Загружать части в R2 с путями `/users/{userId}/projects/{projectId}/audio/scene-{sceneNumber}.mp3`
- Возвращать массив URL для каждой сцены

`**audio-splitting.controller.ts**` (≤150 строк):

- `POST /api/scripts/:scriptId/audio/split` - запуск разделения аудио

---

## Этап 3: Frontend - Zustand Store для управления слоями

### 3.1 Новый store для композиции

**Создать `client/src/features/conveyor/stores/useCompositionStore.ts**` (≤500 строк):

```typescript
interface CompositionStore {
  // Текущий скрипт и сцены
  scriptId: string | null
  scenes: Map<string, EnhancedScene> // Map by sceneId
  currentSceneId: string | null
  
  // Загрузка данных
  loadScript: (scriptId: string) => Promise<void>
  
  // Управление сценами
  setCurrentScene: (sceneId: string) => void
  addScene: (scene: EnhancedScene) => void
  updateScene: (sceneId: string, updates: Partial<EnhancedScene>) => void
  removeScene: (sceneId: string) => void
  
  // Управление слоями
  updateBackgroundLayer: (sceneId: string, updates: Partial<BackgroundLayer>) => void
  updateOverlayLayer: (sceneId: string, updates: Partial<OverlayLayer>) => void
  updateTextLayer: (sceneId: string, updates: Partial<TextLayer>) => void
  
  // Управление композицией
  setCompositionMode: (sceneId: string, mode: CompositionMode) => void
  updateSplitSettings: (sceneId: string, settings: Partial<SceneComposition>) => void
  
  // Drag & drop для overlay
  updateOverlayPosition: (sceneId: string, position: Position) => void
  
  // Генерация контента
  generateContent: (
    sceneId: string, 
    layerType: 'background' | 'overlay',
    prompt: string,
    model: string,
    type: 'image' | 'video'
  ) => Promise<void>
  
  // Загрузка файлов
  uploadFile: (sceneId: string, layerType: LayerType, file: File) => Promise<void>
  
  // Статус генерации
  pollGenerationStatus: (layerId: string, jobId: string) => void
  
  // История для undo/redo
  past: EnhancedScene[][]
  future: EnhancedScene[][]
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}
```

### 3.2 Интеграция с React Query

**Создать `client/src/features/conveyor/services/layersService.ts**` (≤500 строк):

- API клиент для взаимодействия с backend endpoints
- Используем TanStack Query для кеширования и синхронизации

**Хуки:**

- `useSceneWithLayers(sceneId)` - загрузка сцены со слоями
- `useScriptWithLayers(scriptId)` - загрузка скрипта со всеми сценами
- `useUpdateLayer(layerId)` - мутация для обновления слоя
- `useGenerateContent()` - запуск генерации контента
- `useGenerationStatus(jobId)` - polling статуса генерации

---

## Этап 4: Frontend - UI компоненты редактора

### 4.1 Главный компонент редактора

**Обновить `client/src/features/conveyor/components/VideoEditorMain.tsx`:**

- Заменить текущую логику на новую систему слоев
- Layout: Preview (слева) + Toolbar (справа)
- Загрузка данных через `useCompositionStore`

### 4.2 Компонент предпросмотра с Remotion

**Создать `client/src/features/conveyor/components/preview/RemotionPreview.tsx**` (≤500 строк):

- Использовать `@remotion/player` для интерактивного предпросмотра
- Композиция сцен через `<AbsoluteFill>` с z-index для слоев
- Поддержка overlay и split режимов
- Контролы: play/pause, seek, переключение сцен
- Aspect ratio: 16:9, 9:16, 1:1

**Создать `client/src/features/conveyor/components/preview/RemotionComposition.tsx`:**

- Remotion композиция для рендеринга сцены
- Логика overlay mode: фон + overlay с AbsoluteFill
- Логика split mode: деление canvas на две части
- Текстовый слой с Remotion Interpolate для бегущей строки

**Создать `client/src/features/conveyor/components/preview/DraggableOverlay.tsx`:**

- Компонент для drag & drop overlay элементов
- Использовать `@dnd-kit/core` для перетаскивания
- Угловые handle для изменения размера
- Grid snapping (привязка к сетке)
- Ограничения: min/max размеры, aspect lock

### 4.3 Правая панель инструментов

**Создать `client/src/features/conveyor/components/toolbar/EditorToolbar.tsx**` (≤500 строк):

- Структура: стрелка внизу сцены для открытия панели (как на дизайне)
- Вкладки: "Визуалы", "Текст", "Аудио", "Композиция"

**Вкладка "Визуалы" - `VisualsTab.tsx`:**

- Выбор типа контента для background: Avatar, Image, Video
- Выбор типа контента для overlay: Avatar, Image, Video
- Кнопки генерации:
  - "Создать картинку" (Kie.ai text-to-image)
  - "Создать видео" (Kie.ai text-to-video)
  - "Картинка в видео" (Kie.ai i2v)
  - "Загрузить файл"
- Статус генерации с progress bar
- Превью сгенерированного контента

**Вкладка "Композиция" - `CompositionTab.tsx`:**

- Переключатель режима: Overlay / Split
- Настройки Split:
  - Ползунок пропорций (0-100%)
  - Направление: Горизонтально / Вертикально
  - Порядок: Background сверху / Overlay сверху
- Настройки Grid Snapping:
  - Включить/выключить
  - Размер сетки

**Вкладка "Текст" - `TextTab.tsx`:**

- Включить/выключить текстовый слой
- Выбор режима: Статичный / Бегущая строка
- Позиция: Сверху / По центру / Снизу
- Настройки стиля:
  - Размер шрифта (slider)
  - Цвет текста (color picker)
  - Выравнивание (left/center/right)
  - Цвет фона (опционально)
  - Прозрачность фона (slider)
- Скорость бегущей строки (для marquee режима)

**Вкладка "Аудио" - `AudioTab.tsx`:**

- Загрузка аудио для проекта
- Кнопка "Разделить по сценам"
- Список аудио для каждой сцены
- Прослушивание аудио
- Удаление аудио

### 4.4 Компоненты генерации контента

**Создать `client/src/features/conveyor/components/generation/KieAiDialog.tsx`:**

- Диалог для генерации через Kie.ai
- Поля:
  - Prompt (textarea)
  - Модель (select: Flux Pro, Nano Banana, Recraft V3, etc.)
  - Тип: Image / Video
  - Aspect ratio (если image)
- Кнопка "Генерировать"
- Статус генерации с polling

**Создать `client/src/features/conveyor/components/generation/GenerationStatusCard.tsx`:**

- Карточка с прогрессом генерации
- Статусы: pending, processing, ready, failed
- Превью результата после завершения
- Кнопка "Применить к слою"

### 4.5 Компоненты для drag & drop

**Установить зависимости:**

```bash
npm install @dnd-kit/core @dnd-kit/utilities
```

**Создать `client/src/features/conveyor/components/preview/OverlayTransformBox.tsx`:**

- Компонент для отображения границ overlay элемента
- Угловые handle для resize
- Центральный handle для перемещения
- Логика aspect lock
- Grid snapping

---

## Этап 5: Интеграция Remotion

### 5.1 Установка зависимостей

```bash
npm install remotion @remotion/player @remotion/lambda
```

### 5.2 Регистрация Remotion композиции

**Создать `client/src/features/conveyor/remotion/Root.tsx`:**

```typescript
import { Composition } from 'remotion'
import { SceneComposition } from './SceneComposition'

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="VideoEditor"
        component={SceneComposition}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  )
}
```

**Создать `client/src/features/conveyor/remotion/SceneComposition.tsx`:**

- Основная композиция для рендеринга сцены
- Логика отрисовки background, overlay, textLayer
- Анимации для бегущей строки через `interpolate()`
- Поддержка split и overlay режимов

### 5.3 Финальный рендеринг на сервере

**Создать `server/modules/video-rendering/`:**

`**video-rendering.service.ts**` (≤250 строк):

- `renderVideo(scriptId: string)` - рендеринг финального видео
- Использовать `@remotion/lambda` для серверного рендеринга
- Сохранение результата в R2
- Возврат URL готового видео

`**video-rendering.controller.ts`:**

- `POST /api/scripts/:scriptId/render` - запуск рендеринга
- `GET /api/scripts/:scriptId/render/status` - статус рендеринга

---

## Этап 6: Миграция существующих данных

### 6.1 Скрипт миграции

**Создать `server/migrations/migrate-scenes-to-layers.ts`:**

- Для каждого скрипта в `scripts_library`:
  - Сгенерировать уникальные `sceneId` для каждой сцены в JSONB
  - Создать дефолтные записи в `scene_layers`, `scene_background_layers`, `scene_compositions`
  - Если есть аватар в `scripts_media.videoUrl` - создать background layer с contentType='avatar'
  - Если есть аудио - разделить на сцены через `audio-splitting` сервис

---

## Этап 7: Тестирование и оптимизация

### 7.1 API тестирование

- Тесты для всех новых эндпоинтов
- Проверка создания/обновления слоев
- Проверка генерации контента

### 7.2 UI тестирование

- Проверка drag & drop overlay элементов
- Проверка переключения режимов композиции
- Проверка предпросмотра в Remotion Player
- Проверка генерации через Kie.ai
- Проверка разделения аудио

### 7.3 Оптимизация производительности

- Lazy loading компонентов
- Мемоизация тяжелых вычислений
- Debounce для drag & drop
- Оптимизация React Query кеширования

---

## Зависимости и технологии

**Backend:**

- Drizzle ORM - новые таблицы и миграции
- fluent-ffmpeg - разделение аудио
- @remotion/lambda - серверный рендеринг
- AWS SDK - загрузка в R2

**Frontend:**

- Remotion + @remotion/player - предпросмотр и рендеринг
- @dnd-kit/core - drag & drop
- TanStack Query - управление серверным состоянием
- Zustand - управление клиентским состоянием
- shadcn/ui - UI компоненты

**Внешние API:**

- Kie.ai - генерация изображений и видео
- HeyGen - генерация аватаров (уже реализовано)
- Cloudflare R2 - хранение медиа

---

## Архитектурные решения

1. **Модульность:** каждый слой (background, overlay, text) хранится в отдельной таблице, связанной через `scene_layers`
2. **Разделение ответственности:** композиция (overlay/split) отделена от данных слоев
3. **Гибкость:** легко добавить новые типы слоев или режимы композиции
4. **Производительность:** R2 для хранения медиа, React Query для кеширования, Zustand для быстрого UI
5. **Масштабируемость:** серверный рендеринг через Remotion Lambda, асинхронная генерация контента

---

## Критерии успеха

- ✅ Пользователь может добавлять background, overlay и textLayer для каждой сцены
- ✅ Пользователь может переключать между overlay и split режимами
- ✅ Пользователь может генерировать контент через Kie.ai (image, video, i2v)
- ✅ Пользователь может перетаскивать и изменять размер overlay элементов
- ✅ Пользователь видит интерактивный предпросмотр через Remotion Player
- ✅ Бегущая строка работает корректно в текстовом слое
- ✅ Аудио разделяется на части по сценам
- ✅ Финальное видео рендерится на сервере и сохраняется в R2
- ✅ Все медиа файлы хранятся в R2 по структуре `/users/{userId}/projects/{projectId}/...`

