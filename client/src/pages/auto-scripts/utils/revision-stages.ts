/**
 * Revision Stages Utilities
 * Константы и утилиты для этапов обработки ревизии
 */

export const REVISION_STAGES = {
  WRITER: 5,
  QC: 6,
  OPTIMIZER: 7,
  GATE: 8,
  DELIVERY: 9,
} as const;

export type RevisionStage = typeof REVISION_STAGES[keyof typeof REVISION_STAGES];

export interface StageInfo {
  stage: number;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  estimatedDuration: number; // секунды
}

/**
 * Информация о каждом этапе обработки ревизии
 */
export const STAGE_INFO: Record<RevisionStage, StageInfo> = {
  [REVISION_STAGES.WRITER]: {
    stage: 5,
    name: "writer",
    displayName: "Переписывание",
    description: "AI переписывает сценарий по вашим замечаниям",
    icon: "✍️",
    estimatedDuration: 15,
  },
  [REVISION_STAGES.QC]: {
    stage: 6,
    name: "qc",
    displayName: "Проверка качества",
    description: "Проверка качества нового сценария",
    icon: "🔬",
    estimatedDuration: 10,
  },
  [REVISION_STAGES.OPTIMIZER]: {
    stage: 7,
    name: "optimizer",
    displayName: "Оптимизация",
    description: "Улучшение слабых мест сценария",
    icon: "⚡",
    estimatedDuration: 10,
  },
  [REVISION_STAGES.GATE]: {
    stage: 8,
    name: "gate",
    displayName: "Финальная проверка",
    description: "Принятие решения о качестве сценария",
    icon: "✅",
    estimatedDuration: 1,
  },
  [REVISION_STAGES.DELIVERY]: {
    stage: 9,
    name: "delivery",
    displayName: "Сохранение",
    description: "Сохранение результата",
    icon: "📬",
    estimatedDuration: 1,
  },
};

/**
 * Получить информацию об этапе по номеру
 */
export function getStageInfo(stage: number): StageInfo | null {
  const stageInfo = Object.values(STAGE_INFO).find((info) => info.stage === stage);
  return stageInfo || null;
}

/**
 * Получить название этапа
 */
export function getStageName(stage: number): string {
  const info = getStageInfo(stage);
  return info?.displayName || `Этап ${stage}`;
}

/**
 * Получить описание этапа
 */
export function getStageDescription(stage: number): string {
  const info = getStageInfo(stage);
  return info?.description || "Обработка...";
}

/**
 * Получить иконку этапа
 */
export function getStageIcon(stage: number): string {
  const info = getStageInfo(stage);
  return info?.icon || "⏳";
}

/**
 * Вычислить общий прогресс обработки (в процентах)
 */
export function calculateProgress(currentStage: number, stageHistory: any[]): number {
  const totalStages = Object.keys(STAGE_INFO).length;
  const completedStages = stageHistory?.filter((s) => s.completed).length || 0;
  
  // Если текущий этап завершён, считаем его как завершённый
  const currentStageCompleted = stageHistory?.some(
    (s) => s.stage === currentStage && s.completed
  );
  
  const progress = currentStageCompleted
    ? (completedStages / totalStages) * 100
    : ((completedStages - 1) / totalStages) * 100 + (1 / totalStages) * 50; // 50% текущего этапа
  
  return Math.min(100, Math.max(0, Math.round(progress)));
}

/**
 * Вычислить примерное время до завершения (в секундах)
 */
export function estimateTimeRemaining(
  currentStage: number,
  stageHistory: any[],
  elapsedTime: number
): number {
  const remainingStages = Object.values(STAGE_INFO)
    .filter((info) => info.stage >= currentStage)
    .map((info) => info.estimatedDuration);
  
  const totalRemaining = remainingStages.reduce((sum, duration) => sum + duration, 0);
  
  // Если уже прошло больше времени, чем ожидалось, уменьшаем оценку
  const averageTimePerStage = elapsedTime / (stageHistory?.length || 1);
  const adjustedRemaining = Math.max(0, totalRemaining - averageTimePerStage);
  
  return Math.round(adjustedRemaining);
}

