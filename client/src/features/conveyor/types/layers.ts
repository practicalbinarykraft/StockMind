// ============================================================================
// TYPES FOR VIDEO EDITOR LAYERS
// ============================================================================

// Базовые типы слоев
export type LayerType = 'background' | 'overlay' | 'textLayer';
export type ContentType = 'avatar' | 'image' | 'video';
export type GenerationStatus = 'pending' | 'processing' | 'ready' | 'failed';
export type CompositionMode = 'overlay' | 'split';

// Настройки удаления фона (AI-сегментация через MediaPipe)
export interface BackgroundRemovalSettings {
  enabled: boolean;
  threshold: number; // 0-1, порог уверенности сегментации
  edgeBlur: number; // 0-1, мягкость краёв маски
}

export const DEFAULT_BG_REMOVAL_SETTINGS: BackgroundRemovalSettings = {
  enabled: true,
  threshold: 0.5,
  edgeBlur: 0.15,
};

/**
 * Возвращает URL для стриминга медиа слоя через сервер (решает CORS для canvas).
 * Используется при удалении фона, где нужен доступ к пикселям видео.
 */
export function getLayerStreamUrl(scriptId: string, layerId: string): string {
  return `/api/scripts/${scriptId}/layers/${layerId}/stream`;
}

// Позиционирование overlay (в процентах от canvas)
export interface Position {
  x: number; // 0-100 (%)
  y: number; // 0-100 (%)
  width: number; // 0-100 (%)
  height: number; // 0-100 (%)
}

// Позиционирование текста
export interface TextPosition {
  type: 'top' | 'center' | 'bottom' | 'custom';
  x?: number; // Для custom позиции (0-100%)
  y?: number; // Для custom позиции (0-100%)
}

// Размеры контента
export interface Dimensions {
  width: number;
  height: number;
}

// Базовый интерфейс слоя
export interface SceneLayer {
  id: string;
  sceneId: string;
  scriptId: string;
  layerType: LayerType;
  order: number;
  isVisible: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Background слой
export interface BackgroundLayer extends SceneLayer {
  layerType: 'background';
  contentType: ContentType;
  sourceUrl?: string;
  generationPrompt?: string;
  generationModel?: string;
  generationStatus?: GenerationStatus;
  generationJobId?: string;
  dimensions?: Dimensions;
  metadata?: Record<string, any>;
}

// Overlay слой
export type OverlayObjectFit = 'contain' | 'cover' | 'fill';

export interface OverlayLayer extends SceneLayer {
  layerType: 'overlay';
  contentType: ContentType;
  sourceUrl?: string;
  position: Position;
  objectFit: OverlayObjectFit;
  aspectLock: boolean;
  minSize?: Dimensions;
  maxSize?: Dimensions;
  rotation?: number; // Угол поворота (зарезервировано)
  generationPrompt?: string;
  generationModel?: string;
  generationStatus?: GenerationStatus;
  generationJobId?: string;
  metadata?: Record<string, any>;
}

// Тип анимации текста
export type TextAnimation = 'none' | 'fadeIn' | 'typewriter' | 'slideUp' | 'slideDown' | 'scaleIn';

// Text слой
export interface TextLayer extends SceneLayer {
  layerType: 'textLayer';
  text: string;
  mode: 'static' | 'marquee';
  position: TextPosition;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  textAlign: 'left' | 'center' | 'right';
  backgroundColor?: string;
  backgroundOpacity: number;
  marqueeSpeed: number;
  isVisible: boolean;
  // Эффекты текста
  textShadow?: string;
  textStroke?: string;
  textStrokeColor?: string;
  animation?: TextAnimation;
  letterSpacing?: number;
  lineHeight?: number;
}

// Композиция сцены
export interface SceneComposition {
  id: string;
  sceneId: string;
  scriptId: string;
  mode: CompositionMode;
  splitRatio: number; // 0-1
  splitDirection: 'horizontal' | 'vertical';
  splitOrder: 'background-first' | 'overlay-first';
  gridSnapping: boolean;
  gridSize: number;
  createdAt?: string;
  updatedAt?: string;
}

// Расширенная сцена с композицией и слоями
export interface EnhancedScene {
  id: string;
  order: number;
  text: string;
  audioUrl?: string;
  durationInFrames: number;
  // Композиция и слои
  composition: SceneComposition;
  layers: {
    background?: BackgroundLayer;
    overlay?: OverlayLayer;
    textLayer?: TextLayer;
  };
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

// Запрос на создание слоя
export interface CreateLayerRequest {
  sceneId: string;
  scriptId: string;
  layerType: LayerType;
  order?: number;
  isVisible?: boolean;
}

// Запрос на обновление background слоя
export interface UpdateBackgroundLayerRequest {
  contentType?: ContentType;
  sourceUrl?: string;
  generationPrompt?: string;
  generationModel?: string;
  dimensions?: Dimensions;
  metadata?: Record<string, any>;
}

// Запрос на обновление overlay слоя
export interface UpdateOverlayLayerRequest {
  contentType?: ContentType;
  sourceUrl?: string;
  position?: Position;
  objectFit?: OverlayObjectFit;
  aspectLock?: boolean;
  minSize?: Dimensions;
  maxSize?: Dimensions;
  rotation?: number;
  generationPrompt?: string;
  generationModel?: string;
  metadata?: Record<string, any>;
}

// Запрос на обновление text слоя
export interface UpdateTextLayerRequest {
  text?: string;
  mode?: 'static' | 'marquee';
  textPosition?: TextPosition;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  backgroundOpacity?: number;
  marqueeSpeed?: number;
  isVisible?: boolean;
  textShadow?: string;
  textStroke?: string;
  textStrokeColor?: string;
  animation?: TextAnimation;
  letterSpacing?: number;
  lineHeight?: number;
}

// Запрос на обновление композиции
export interface UpdateCompositionRequest {
  mode?: CompositionMode;
  splitRatio?: number;
  splitDirection?: 'horizontal' | 'vertical';
  splitOrder?: 'background-first' | 'overlay-first';
  gridSnapping?: boolean;
  gridSize?: number;
}

// Ответ с полными данными сцены
export interface SceneWithLayersResponse {
  sceneId: string;
  composition: SceneComposition;
  layers: Array<BackgroundLayer | OverlayLayer | TextLayer>;
}

// Ответ с полными данными скрипта
export interface ScriptWithLayersResponse {
  scriptId: string;
  scenes: SceneWithLayersResponse[];
}

// ============================================================================
// GENERATION TYPES
// ============================================================================

export type KieModel = 
  | 'flux-pro' 
  | 'nano-banana-pro' 
  | 'recraft-v3' 
  | 'flux-schnell' 
  | 'kling-ai-video' 
  | 'kling-ai-i2v';

export interface TextToImageRequest {
  prompt: string;
  model: KieModel;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '3:2' | '2:3' | '4:5' | '5:4' | '21:9';
  resolution?: '1K' | '2K' | '4K';
  numImages?: number;
}

export interface TextToVideoRequest {
  prompt: string;
  model: 'kling-ai-video';
  duration?: number; // seconds
  aspectRatio?: '16:9' | '9:16';
}

export interface ImageToVideoRequest {
  imageUrl: string;
  prompt?: string;
  model: 'kling-ai-i2v';
  duration?: number;
}

export interface GenerationJob {
  id: string;
  type: 'image' | 'video';
  status: GenerationStatus;
  resultUrl?: string;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}
