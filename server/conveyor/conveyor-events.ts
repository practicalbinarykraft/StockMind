/**
 * Conveyor Events System
 * EventEmitter for real-time agent thinking/progress updates
 * Also persists events to database for page refresh recovery
 */
import { EventEmitter } from "events";
import { logger } from "../lib/logger";
import { conveyorLogsStorage } from "../storage/conveyor-logs.storage";

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Check if a string is a valid UUID (for foreign key constraint)
 */
function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

export type ConveyorEventType =
  | "item:started"
  | "item:completed"
  | "item:failed"
  | "stage:started"
  | "stage:thinking"
  | "stage:progress"
  | "stage:completed"
  | "stage:failed"
  | "agent:message";

export interface ConveyorEvent {
  type: ConveyorEventType;
  userId: string;
  itemId: string;
  timestamp: Date;
  data: {
    stage?: number;
    stageName?: string;
    message?: string;
    thinking?: string;
    progress?: number;
    result?: any;
    error?: string;
  };
}

// Stage names in Russian for display
export const STAGE_NAMES_RU: Record<number, string> = {
  1: "Скаут",
  2: "Скорер",
  3: "Аналитик",
  4: "Архитектор",
  5: "Писатель",
  6: "Контроль качества",
  7: "Оптимизатор",
  8: "Шлюз",
  9: "Доставка",
};

// Agent descriptions for display
export const AGENT_DESCRIPTIONS: Record<number, string> = {
  1: "Собираю исходные данные из источников",
  2: "Оцениваю вирусный потенциал контента",
  3: "Анализирую факты и ключевые моменты",
  4: "Проектирую структуру сценария",
  5: "Пишу текст сценария",
  6: "Проверяю качество и соответствие",
  7: "Улучшаю слабые места",
  8: "Принимаю финальное решение",
  9: "Сохраняю готовый сценарий",
};

class ConveyorEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Allow many concurrent listeners
  }

  /**
   * Emit a conveyor event to all subscribed clients
   */
  emitConveyorEvent(event: ConveyorEvent) {
    logger.debug(`[ConveyorEvents] Emitting ${event.type}`, {
      userId: event.userId,
      itemId: event.itemId,
      stage: event.data.stage,
    });
    this.emit("conveyor-event", event);
    // Also emit user-specific event for SSE routing
    this.emit(`user:${event.userId}`, event);
  }

  /**
   * Helper: Item started processing
   */
  itemStarted(userId: string, itemId: string, sourceTitle: string) {
    this.emitConveyorEvent({
      type: "item:started",
      userId,
      itemId,
      timestamp: new Date(),
      data: {
        message: `Начинаю обработку: "${sourceTitle}"`,
      },
    });
  }

  /**
   * Helper: Item completed successfully
   */
  itemCompleted(userId: string, itemId: string, scriptId?: string) {
    this.emitConveyorEvent({
      type: "item:completed",
      userId,
      itemId,
      timestamp: new Date(),
      data: {
        message: "Сценарий готов!",
        result: { scriptId },
      },
    });
  }

  /**
   * Helper: Item failed
   */
  itemFailed(userId: string, itemId: string, reason: string) {
    this.emitConveyorEvent({
      type: "item:failed",
      userId,
      itemId,
      timestamp: new Date(),
      data: {
        message: `Обработка прервана: ${reason}`,
        error: reason,
      },
    });
  }

  /**
   * Helper: Stage started
   */
  stageStarted(userId: string, itemId: string, stage: number) {
    const stageName = STAGE_NAMES_RU[stage] || `Этап ${stage}`;
    const description = AGENT_DESCRIPTIONS[stage] || "";

    this.emitConveyorEvent({
      type: "stage:started",
      userId,
      itemId,
      timestamp: new Date(),
      data: {
        stage,
        stageName,
        message: `${stageName}: ${description}`,
      },
    });
  }

  /**
   * Helper: Agent is "thinking" - for real-time updates during AI processing
   * Also persists to database for page refresh recovery
   */
  stageThinking(userId: string, itemId: string, stage: number, thinking: string) {
    const stageName = STAGE_NAMES_RU[stage] || `Этап ${stage}`;

    this.emitConveyorEvent({
      type: "stage:thinking",
      userId,
      itemId,
      timestamp: new Date(),
      data: {
        stage,
        stageName,
        thinking,
        message: thinking,
      },
    });

    // Persist to database (non-blocking)
    // Only use itemId if it's a valid UUID, otherwise pass null to avoid FK constraint violation
    const validItemId = isValidUUID(itemId) ? itemId : null;
    conveyorLogsStorage.logThinking(userId, validItemId, stage, stageName, thinking).catch((err) => {
      logger.error("[ConveyorEvents] Failed to persist thinking event", { error: err.message });
    });
  }

  /**
   * Helper: Stage progress update (0-100)
   */
  stageProgress(userId: string, itemId: string, stage: number, progress: number, message?: string) {
    const stageName = STAGE_NAMES_RU[stage] || `Этап ${stage}`;

    this.emitConveyorEvent({
      type: "stage:progress",
      userId,
      itemId,
      timestamp: new Date(),
      data: {
        stage,
        stageName,
        progress,
        message: message || `${stageName}: ${progress}%`,
      },
    });
  }

  /**
   * Helper: Stage completed
   */
  stageCompleted(userId: string, itemId: string, stage: number, result?: any) {
    const stageName = STAGE_NAMES_RU[stage] || `Этап ${stage}`;

    this.emitConveyorEvent({
      type: "stage:completed",
      userId,
      itemId,
      timestamp: new Date(),
      data: {
        stage,
        stageName,
        message: `${stageName}: Готово ✓`,
        result,
      },
    });
  }

  /**
   * Helper: Stage failed
   */
  stageFailed(userId: string, itemId: string, stage: number, error: string) {
    const stageName = STAGE_NAMES_RU[stage] || `Этап ${stage}`;

    this.emitConveyorEvent({
      type: "stage:failed",
      userId,
      itemId,
      timestamp: new Date(),
      data: {
        stage,
        stageName,
        message: `${stageName}: Ошибка - ${error}`,
        error,
      },
    });
  }

  /**
   * Helper: Agent sends a custom message (like "consulting with Architect")
   */
  agentMessage(userId: string, itemId: string, stage: number, message: string) {
    const stageName = STAGE_NAMES_RU[stage] || `Агент ${stage}`;

    this.emitConveyorEvent({
      type: "agent:message",
      userId,
      itemId,
      timestamp: new Date(),
      data: {
        stage,
        stageName,
        message: `💭 ${stageName}: ${message}`,
      },
    });
  }
}

// Singleton instance
export const conveyorEvents = new ConveyorEventEmitter();
