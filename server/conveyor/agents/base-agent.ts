/**
 * Base Agent
 * Abstract class that all conveyor agents extend
 */
import { logger } from "../../lib/logger";
import { conveyorLogsStorage } from "../../storage/conveyor-logs.storage";
import { conveyorEvents } from "../conveyor-events";
import type { AgentResult, ConveyorItemData, StageHistoryEntry } from "../types";

export interface AgentContext {
  userId: string;
  itemId: string;
  apiKey?: string;
}

export abstract class BaseAgent<TInput, TOutput> {
  protected abstract name: string;
  protected abstract stage: number;

  /**
   * Main processing method - must be implemented by each agent
   */
  protected abstract execute(input: TInput, context: AgentContext): Promise<TOutput>;

  /**
   * Validate input before processing
   */
  protected abstract validate(input: TInput): { valid: boolean; error?: string };

  /**
   * Whether this agent uses AI
   */
  protected usesAI: boolean = true;

  /**
   * Process the input through the agent
   */
  async process(input: TInput, context: AgentContext): Promise<AgentResult<TOutput>> {
    const startTime = Date.now();

    // Emit stage started event for SSE
    conveyorEvents.stageStarted(context.userId, context.itemId, this.stage);

    // Log stage start
    await conveyorLogsStorage.logStageStarted(
      context.userId,
      context.itemId,
      this.stage,
      this.name
    );

    logger.info(`[Conveyor] ${this.name} started`, {
      stage: this.stage,
      itemId: context.itemId,
    });

    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.valid) {
        throw new Error(validation.error || "Validation failed");
      }

      // Execute agent logic
      const data = await this.execute(input, context);
      const durationMs = Date.now() - startTime;

      // Emit stage completed event for SSE
      conveyorEvents.stageCompleted(context.userId, context.itemId, this.stage, data);

      // Log success
      await conveyorLogsStorage.logStageCompleted(
        context.userId,
        context.itemId,
        this.stage,
        this.name,
        { durationMs }
      );

      logger.info(`[Conveyor] ${this.name} completed`, {
        stage: this.stage,
        itemId: context.itemId,
        durationMs,
      });

      return {
        success: true,
        data,
        cost: 0, // Override in AI agents
        durationMs,
      };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;

      // Emit stage failed event for SSE
      conveyorEvents.stageFailed(context.userId, context.itemId, this.stage, error.message);

      // Log failure
      await conveyorLogsStorage.logStageFailed(
        context.userId,
        context.itemId,
        this.stage,
        this.name,
        error.message
      );

      logger.error(`[Conveyor] ${this.name} failed`, {
        stage: this.stage,
        itemId: context.itemId,
        error: error.message,
        durationMs,
      });

      return {
        success: false,
        error: error.message,
        cost: 0,
        durationMs,
      };
    }
  }

  /**
   * Emit a "thinking" event for this agent
   * Used by subclasses to show real-time progress
   */
  protected emitThinking(context: AgentContext, message: string): void {
    conveyorEvents.stageThinking(context.userId, context.itemId, this.stage, message);
  }

  /**
   * Emit an agent message event
   * Used for inter-agent communication display (e.g., "consulting with Architect")
   */
  protected emitMessage(context: AgentContext, message: string): void {
    conveyorEvents.agentMessage(context.userId, context.itemId, this.stage, message);
  }

  /**
   * Create stage history entry
   */
  createHistoryEntry(success: boolean, durationMs: number, error?: string): StageHistoryEntry {
    return {
      stage: this.stage,
      agentName: this.name,
      startedAt: new Date(Date.now() - durationMs),
      completedAt: new Date(),
      success,
      error,
    };
  }

  /**
   * Get agent name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get agent stage number
   */
  getStage(): number {
    return this.stage;
  }
}

/**
 * Base class for AI-powered agents
 * Adds cost tracking and API key handling
 */
export abstract class BaseAIAgent<TInput, TOutput> extends BaseAgent<TInput, TOutput> {
  protected usesAI = true;
  protected estimatedCost: number = 0.01; // Default estimated cost

  /**
   * Call AI and track cost
   */
  protected async callAI<T>(
    apiKey: string,
    prompt: string,
    parser: (response: string) => T
  ): Promise<{ data: T; cost: number }> {
    // This will be implemented to call the actual AI service
    // For now, return placeholder
    throw new Error("callAI must be implemented in subclass");
  }

  /**
   * Override process to include cost tracking
   */
  async process(input: TInput, context: AgentContext): Promise<AgentResult<TOutput>> {
    if (!context.apiKey) {
      return {
        success: false,
        error: "API key required for AI agent",
        cost: 0,
        durationMs: 0,
      };
    }

    const result = await super.process(input, context);

    // Add estimated cost if successful
    if (result.success) {
      result.cost = this.estimatedCost;
    }

    return result;
  }
}
