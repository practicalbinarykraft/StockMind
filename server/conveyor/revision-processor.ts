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

      // 2. Validate that parent item has required stage data
      const missingData: string[] = [];
      if (!parentItem.sourceData) missingData.push('sourceData');
      if (!parentItem.analysisData) missingData.push('analysisData');
      if (!parentItem.architectureData) missingData.push('architectureData');
      
      if (missingData.length > 0) {
        logger.warn("[RevisionProcessor] Parent item missing stage data, attempting recovery", {
          scriptId: script.id,
          parentItemId: parentItem.id,
          missingData,
        });
        
        // Try to reconstruct missing data from script
        const recoveredParentItem = await this.recoverStageData(parentItem, script);
        
        if (!recoveredParentItem) {
          return {
            success: false,
            error: `Cannot regenerate: missing required data (${missingData.join(', ')}). Try creating a new script from source.`,
          };
        }
        
        // Use recovered item
        Object.assign(parentItem, recoveredParentItem);
      }

      // 3. Get version history for context
      const versions = await autoScriptVersionsStorage.getByScriptId(script.id);
      const previousVersionsData = versions.map((v) => ({
        versionNumber: v.versionNumber,
        fullScript: v.fullScript || "",
        scenes: (v.scenes as any[]) || [],
        feedbackText: v.feedbackText,
      }));

      // 4. Create revision context
      const revisionContext: RevisionContext = {
        notes: feedbackText,
        previousScriptId: script.id,
        attempt: script.revisionCount + 1,
        previousVersions: previousVersionsData,
        selectedSceneIds: selectedSceneIds,
      };

      // 5. Create new conveyor item for revision
      const newItem = await conveyorItemsStorage.createForRevision(
        parentItem,
        revisionContext
      );

      logger.info("[RevisionProcessor] Created revision item", {
        scriptId: script.id,
        newItemId: newItem.id,
        parentItemId: parentItem.id,
        attempt: revisionContext.attempt,
        hadMissingData: missingData.length > 0,
      });

      // 6. Emit event for SSE
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
   * Try to recover missing stage data from existing script and parent item
   * Returns updated item data or null if recovery failed
   */
  private async recoverStageData(
    parentItem: ConveyorItem,
    script: AutoScript
  ): Promise<Partial<ConveyorItem> | null> {
    try {
      const recovered: Partial<ConveyorItem> = {};
      
      // Recover sourceData from parent or construct minimal version
      if (!parentItem.sourceData) {
        // Try to get source content from the original source
        recovered.sourceData = {
          title: script.title,
          content: script.fullScript || '',
          url: (script as any).sourceUrl || null,
          publishedAt: script.createdAt?.toISOString() || new Date().toISOString(),
        };
        logger.info("[RevisionProcessor] Recovered sourceData from script", {
          scriptId: script.id,
        });
      }
      
      // Recover analysisData - construct from script scores
      if (!parentItem.analysisData) {
        recovered.analysisData = {
          overallScore: script.finalScore || 70,
          hookScore: script.hookScore || 70,
          structureScore: script.structureScore || 70,
          emotionalScore: script.emotionalScore || 70,
          ctaScore: script.ctaScore || 70,
          recommendations: [],
          analysis: 'Recovered from existing script data',
        };
        logger.info("[RevisionProcessor] Recovered analysisData from script scores", {
          scriptId: script.id,
        });
      }
      
      // Recover architectureData from script scenes
      if (!parentItem.architectureData) {
        const scenes = (script.scenes as any[]) || [];
        recovered.architectureData = {
          sceneCount: scenes.length,
          scenes: scenes.map((scene: any, index: number) => ({
            sceneNumber: index + 1,
            type: index === 0 ? 'hook' : index === scenes.length - 1 ? 'cta' : 'body',
            text: scene.text || '',
            duration: scene.duration || 5,
            visualNotes: scene.visualNotes || scene.visualSource || '',
          })),
          totalDuration: scenes.reduce((sum: number, s: any) => sum + (s.duration || 5), 0),
          format: script.formatId || script.formatName || 'news_update',
        };
        logger.info("[RevisionProcessor] Recovered architectureData from script scenes", {
          scriptId: script.id,
          sceneCount: scenes.length,
        });
      }
      
      // Update parent item in database with recovered data
      if (Object.keys(recovered).length > 0) {
        await conveyorItemsStorage.update(parentItem.id, recovered);
        logger.info("[RevisionProcessor] Updated parent item with recovered data", {
          parentItemId: parentItem.id,
          recoveredFields: Object.keys(recovered),
        });
      }
      
      return { ...parentItem, ...recovered };
    } catch (error: any) {
      logger.error("[RevisionProcessor] Failed to recover stage data", {
        scriptId: script.id,
        parentItemId: parentItem.id,
        error: error.message,
      });
      return null;
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
