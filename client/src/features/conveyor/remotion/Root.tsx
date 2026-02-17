// ============================================================================
// REMOTION ROOT COMPOSITION
// ============================================================================
// Регистрация всех доступных композиций для Remotion
// Используется как точка входа для Remotion Player и Remotion Lambda

import { Composition } from 'remotion';
import { SceneComposition } from './SceneComposition';
import { EnhancedScene } from '../types/layers';

// Константы для дефолтных параметров композиции
export const DEFAULT_FPS = 30;
export const DEFAULT_WIDTH = 1920;
export const DEFAULT_HEIGHT = 1080;
export const DEFAULT_DURATION_FRAMES = 300; // 10 секунд по умолчанию

// Props для VideoEditor композиции
export interface VideoEditorCompositionProps {
  scenes: EnhancedScene[];
  width?: number;
  height?: number;
  fps?: number;
  backgroundColor?: string;
}

/**
 * Корневой компонент для регистрации Remotion композиций
 * Экспортирует все доступные композиции для рендеринга и предпросмотра
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Основная композиция видеоредактора */}
      <Composition
        id="VideoEditor"
        component={SceneComposition}
        durationInFrames={DEFAULT_DURATION_FRAMES}
        fps={DEFAULT_FPS}
        width={DEFAULT_WIDTH}
        height={DEFAULT_HEIGHT}
        defaultProps={{
          scenes: [],
          backgroundColor: '#000000',
        }}
      />

      {/* Дополнительные композиции для разных форматов */}
      <Composition
        id="VideoEditor-Vertical"
        component={SceneComposition}
        durationInFrames={DEFAULT_DURATION_FRAMES}
        fps={DEFAULT_FPS}
        width={1080}
        height={1920}
        defaultProps={{
          scenes: [],
          backgroundColor: '#000000',
        }}
      />

      <Composition
        id="VideoEditor-Square"
        component={SceneComposition}
        durationInFrames={DEFAULT_DURATION_FRAMES}
        fps={DEFAULT_FPS}
        width={1080}
        height={1080}
        defaultProps={{
          scenes: [],
          backgroundColor: '#000000',
        }}
      />
    </>
  );
};

/**
 * Вычисляет общую длительность в кадрах для всех сцен
 */
export const calculateTotalDuration = (scenes: EnhancedScene[]): number => {
  return scenes.reduce((total, scene) => total + scene.durationInFrames, 0);
};

/**
 * Определяет в какой сцене находится текущий кадр
 */
export const getCurrentScene = (
  scenes: EnhancedScene[],
  frame: number
): { scene: EnhancedScene; sceneStartFrame: number } | null => {
  let currentFrame = 0;
  
  for (const scene of scenes) {
    const sceneEndFrame = currentFrame + scene.durationInFrames;
    
    if (frame >= currentFrame && frame < sceneEndFrame) {
      return {
        scene,
        sceneStartFrame: currentFrame,
      };
    }
    
    currentFrame = sceneEndFrame;
  }
  
  return null;
};
