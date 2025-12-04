/**
 * Revision Processor
 * Handles the creation and processing of revision requests for auto-scripts
 */
import { logger } from "../lib/logger";
import { autoScriptsStorage } from "../storage/auto-scripts.storage";
import { conveyorItemsStorage } from "../storage/conveyor-items.storage";
import { autoScriptVersionsStorage } from "../storage/user-writing-profile.storage";
import { conveyorEvents } from "./conveyor-events";
import type { ConveyorItem, AutoScript } from "@shared/schema";

export interface RevisionContext {
  notes: string;
  previousScriptId: string;
  attempt: number;
  previousVersions: Array<{
    versionNumber: number;
    fullScript: string;
    scenes: any[];
    feedbackText: string | null;
  }>;
  selectedSceneIds?: number[];
}

export interface RevisionResult {
  success: boolean;
  conveyorItemId?: string;
  error?: string;
}

export class RevisionProcessor {
  /**
   * Create a new conveyor item for revision processing
   * This prepares everything needed to run the revision through the pipeline
   */
  async createRevisionItem(
    script: AutoScript,
    feedbackText: string,
    selectedSceneIds?: number[]
  ): Promise<RevisionResult> {
    try {
      // 1. Get the original conveyor item
      if (!script.conveyorItemId) {
        return {
          success: false,
          error: "Script has no associated conveyor item",
        };
      }

      const parentItem = await conveyorItemsStorage.getById(script.conveyorItemId);
      if (!parentItem) {
        return {
          success: false,
          error: "Original conveyor item not found",
        };
      }

      // 2. Get version history for context
      const versions = await autoScriptVersionsStorage.getByScriptId(script.id);
      const previousVersionsData = versions.map((v) => ({
        versionNumber: v.versionNumber,
        fullScript: v.fullScript || "",
        scenes: (v.scenes as any[]) || [],
        feedbackText: v.feedbackText,
      }));

      // 3. Create revision context
      const revisionContext: RevisionContext = {
        notes: feedbackText,
        previousScriptId: script.id,
        attempt: script.revisionCount + 1,
        previousVersions: previousVersionsData,
        selectedSceneIds: selectedSceneIds,
      };

      // 4. Create new conveyor item for revision
      const newItem = await conveyorItemsStorage.createForRevision(
        parentItem,
        revisionContext
      );

      logger.info("[RevisionProcessor] Created revision item", {
        scriptId: script.id,
        newItemId: newItem.id,
        parentItemId: parentItem.id,
        attempt: revisionContext.attempt,
      });

      // 5. Emit event for SSE
      conveyorEvents.itemStarted(
        script.userId,
        newItem.id,
        `Ревизия: ${script.title || "Сценарий"}`
      );

      return {
        success: true,
        conveyorItemId: newItem.id,
      };
    } catch (error: any) {
      logger.error("[RevisionProcessor] Failed to create revision item", {
        scriptId: script.id,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if a conveyor item is a revision item
   */
  isRevisionItem(item: ConveyorItem): boolean {
    return !!item.revisionContext && !!item.parentItemId;
  }

  /**
   * Get revision context from conveyor item
   */
  getRevisionContext(item: ConveyorItem): RevisionContext | null {
    if (!item.revisionContext) return null;
    return item.revisionContext as RevisionContext;
  }
}

export const revisionProcessor = new RevisionProcessor();
