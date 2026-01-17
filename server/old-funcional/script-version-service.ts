import type { IStorage } from '../storage';

/**
 * ScriptVersionService - Business logic layer for script version management
 * 
 * Responsibilities:
 * - Version creation with automatic numbering
 * - Diff calculation between versions
 * - Provenance tracking for audit trail
 * - Scene editing with version history
 * - Recommendation application (single and bulk)
 * - Non-destructive version reverting
 * 
 * Does NOT handle:
 * - HTTP request/response (that's routes.ts)
 * - Direct database access (that's storage.ts)
 * - AI analysis (that's ai-service-advanced.ts)
 */

interface CreateVersionData {
  projectId: string;
  scenes: any[];
  createdBy: 'user' | 'ai' | 'system';
  changes: any;
  parentVersionId?: string;
  analysisResult?: any;
  analysisScore?: number;
  provenance?: any;
  diff?: any[];
  userId?: string;
}

interface SceneDiff {
  sceneId: number;
  before: string;
  after: string;
}

export class ScriptVersionService {
  constructor(private storage: IStorage) {}

  /**
   * Create a new script version
   * 
   * Business logic:
   * - Auto-increment version number
   * - Build full script text from scenes
   * - Calculate diff from current version (if exists)
   * - Build provenance for audit trail
   * - Atomic creation (transaction)
   */
  async createVersion(data: CreateVersionData) {
    const { 
      projectId, 
      scenes, 
      createdBy, 
      changes, 
      parentVersionId, 
      analysisResult, 
      analysisScore, 
      provenance, 
      diff, 
      userId 
    } = data;
    
    // Get next version number
    const versions = await this.storage.getScriptVersions(projectId);
    const nextVersion = versions.length > 0 
      ? Math.max(...versions.map(v => v.versionNumber)) + 1 
      : 1;
    
    // Build full script text
    const fullScript = scenes
      .map((s: any) => `[${s.start}-${s.end}s] ${s.text}`)
      .join('\n');
    
    // Get current version for diff calculation
    const currentVersion = await this.storage.getCurrentScriptVersion(projectId);
    
    // Calculate diff if not provided
    let finalDiff = diff;
    if (!finalDiff && currentVersion && currentVersion.scenes) {
      finalDiff = this.calculateSceneDiff(currentVersion.scenes as any[], scenes);
    }
    
    // Build provenance if not provided
    let finalProvenance = provenance;
    if (!finalProvenance) {
      finalProvenance = {
        source: changes?.type || 'unknown',
        userId: userId,
        ts: new Date().toISOString(),
      };
    }
    
    // Create new version atomically (with transaction to prevent race conditions)
    const newVersion = await this.storage.createScriptVersionAtomic({
      projectId,
      versionNumber: nextVersion,
      fullScript,
      scenes,
      changes,
      createdBy,
      isCurrent: true,
      parentVersionId,
      analysisResult,
      analysisScore,
      provenance: finalProvenance,
      diff: finalDiff,
    });
    
    return newVersion;
  }

  /**
   * Apply manual edit to a single scene
   * 
   * Creates new version with updated scene and provenance
   */
  async applySceneEdit(params: {
    projectId: string;
    sceneId: number;
    newText: string;
    userId: string;
  }) {
    const { projectId, sceneId, newText, userId } = params;
    
    const currentVersion = await this.storage.getCurrentScriptVersion(projectId);
    if (!currentVersion) {
      const error: any = new Error('No script version found');
      error.statusCode = 404;
      throw error;
    }
    
    // Clone and update
    const scenes = JSON.parse(JSON.stringify(currentVersion.scenes));
    const scene = scenes.find((s: any) => s.id === sceneId);
    
    if (!scene) {
      const error: any = new Error('Scene not found');
      error.statusCode = 404;
      throw error;
    }
    
    const oldText = scene.text;
    scene.text = newText;
    scene.manuallyEdited = true;
    scene.lastModified = new Date().toISOString();
    
    // Create new version with provenance
    const newVersion = await this.createVersion({
      projectId,
      scenes,
      createdBy: 'user',
      changes: {
        type: 'manual_edit',
        affectedScenes: [sceneId],
        sceneId,
        before: oldText,
        after: newText,
      },
      parentVersionId: currentVersion.id,
      analysisResult: currentVersion.analysisResult,
      analysisScore: currentVersion.analysisScore ?? undefined,
      provenance: {
        source: 'manual_edit',
        userId: userId,
        ts: new Date().toISOString(),
      },
      userId: userId,
    });
    
    return {
      newVersion,
      needsReanalysis: true,
    };
  }

  /**
   * Revert to a previous version (non-destructive)
   * 
   * Creates new version from old one, preserving history
   */
  async revertToVersion(params: {
    projectId: string;
    versionId: string;
    userId: string;
  }) {
    const { projectId, versionId, userId } = params;
    
    // Get all versions to find target
    const versions = await this.storage.getScriptVersions(projectId);
    const targetVersion = versions.find(v => v.id === versionId);
    
    if (!targetVersion) {
      const error: any = new Error('Version not found');
      error.statusCode = 404;
      throw error;
    }
    
    const currentVersion = await this.storage.getCurrentScriptVersion(projectId);
    
    // Create new version from old one (non-destructive!)
    const newVersion = await this.createVersion({
      projectId,
      scenes: targetVersion.scenes as any[],
      createdBy: 'user',
      changes: {
        type: 'revert',
        revertedFrom: currentVersion?.id,
        revertedToVersion: targetVersion.versionNumber,
      },
      parentVersionId: currentVersion?.id,
      analysisResult: targetVersion.analysisResult as any,
      analysisScore: targetVersion.analysisScore ?? undefined,
      provenance: {
        source: 'revert',
        userId: userId,
        revertedToVersion: targetVersion.versionNumber,
        ts: new Date().toISOString(),
      },
      userId: userId,
    });
    
    return {
      newVersion,
      message: `Reverted to version ${targetVersion.versionNumber}`,
    };
  }

  /**
   * Apply all unapplied recommendations (or specific ones if recommendationIds provided)
   * 
   * Sorts by priority, score delta, confidence, then applies all
   */
  async applyAllRecommendations(params: {
    projectId: string;
    userId: string;
    recommendationIds?: string[]; // Optional: only apply these specific recommendations (UUIDs)
  }) {
    const { projectId, userId, recommendationIds } = params;
    
    const currentVersion = await this.storage.getCurrentScriptVersion(projectId);
    if (!currentVersion) {
      const error: any = new Error('No script version found');
      error.statusCode = 404;
      throw error;
    }
    
    // Get unapplied recommendations
    const allRecommendations = await this.storage.getSceneRecommendations(currentVersion.id);
    let unappliedRecommendations = allRecommendations.filter(r => !r.applied);
    
    // If specific IDs provided, filter to only those
    if (recommendationIds && recommendationIds.length > 0) {
      unappliedRecommendations = unappliedRecommendations.filter(r => 
        r.id && recommendationIds.includes(r.id)
      );
    }
    
    if (unappliedRecommendations.length === 0) {
      return {
        success: true,
        message: 'No recommendations to apply',
        newVersion: currentVersion,
      };
    }
    
    // Sort recommendations by priority, score delta, confidence, and sceneId (for determinism)
    unappliedRecommendations.sort((a, b) => {
      // Priority order: critical > high > medium > low
      const priorityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      // Then by score delta (higher first)
      const aScore = a.scoreDelta || 0;
      const bScore = b.scoreDelta || 0;
      if (aScore !== bScore) return bScore - aScore;
      
      // Then by confidence (higher first)
      const aConf = a.confidence || 0.5;
      const bConf = b.confidence || 0.5;
      if (aConf !== bConf) return bConf - aConf;
      
      // Finally by sceneId (for deterministic ordering)
      return a.sceneId - b.sceneId;
    }); // utils
    
    // Clone scenes and apply all recommendations
    const scenes = JSON.parse(JSON.stringify(currentVersion.scenes));
    const affectedSceneIds: number[] = [];
    
    for (const rec of unappliedRecommendations) {
      const scene = scenes.find((s: any) => s.id === rec.sceneId);
      if (scene) {
        scene.text = rec.suggestedText;
        scene.recommendationApplied = true;
        scene.lastModified = new Date().toISOString();
        affectedSceneIds.push(rec.sceneId);
      }
    }
    
    // Create new version
    const newVersion = await this.createVersion({
      projectId,
      scenes,
      createdBy: 'ai',
      changes: {
        type: 'apply_all_recommendations',
        affectedScenes: affectedSceneIds,
        appliedCount: unappliedRecommendations.length,
      },
      parentVersionId: currentVersion.id,
      analysisResult: currentVersion.analysisResult,
      analysisScore: currentVersion.analysisScore ?? undefined,
      provenance: {
        source: 'apply_all_recommendations',
        userId: userId,
        appliedCount: unappliedRecommendations.length,
        ts: new Date().toISOString(),
      },
      userId: userId,
    });
    
    // Mark all recommendations as applied (batch transaction to prevent partial updates)
    const appliedRecIds = unappliedRecommendations.map(r => r.id);
    await this.storage.markRecommendationsAppliedBatch(appliedRecIds);
    
    return {
      success: true,
      newVersion,
      appliedCount: unappliedRecommendations.length,
      affectedScenes: affectedSceneIds,
    };
  }

  /**
   * Calculate diff between old and new scenes
   * 
   * Returns array of changes with before/after text
   */
  private calculateSceneDiff(oldScenes: any[], newScenes: any[]): SceneDiff[] {
    const diffs: SceneDiff[] = [];
    
    // Compare each scene
    for (let i = 0; i < Math.max(oldScenes.length, newScenes.length); i++) {
      const oldScene = oldScenes[i];
      const newScene = newScenes[i];
      
      // Scene was added
      if (!oldScene && newScene) {
        diffs.push({
          sceneId: newScene.id || i + 1,
          before: '',
          after: newScene.text || '',
        });
      }
      // Scene was removed
      else if (oldScene && !newScene) {
        diffs.push({
          sceneId: oldScene.id || i + 1,
          before: oldScene.text || '',
          after: '',
        });
      }
      // Scene was modified
      else if (oldScene && newScene && oldScene.text !== newScene.text) {
        diffs.push({
          sceneId: newScene.id || i + 1,
          before: oldScene.text || '',
          after: newScene.text || '',
        });
      }
    }
    
    return diffs;
  } // utils
}
