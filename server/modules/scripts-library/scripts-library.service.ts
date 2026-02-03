import { ScriptsLibraryRepo } from "./scripts-library.repo";
import { logger } from "../../lib/logger";
import { analyzeScript } from "../../ai-services/analyze-script";
import { ProjectsService } from "../projects/projects.service";
import { apiKeysService } from "../api-keys/api-keys.service";
import { newsService } from "../news/news.service";
import {
  ScriptNotFoundError,
  ScriptValidationError,
  NoApiKeyConfiguredError,
  ArticleNotFoundError,
} from "./scripts-library.errors";

const repo = new ScriptsLibraryRepo();

/**
 * Scripts Library Service
 * Business logic for script library management
 */
export const scriptsLibraryService = {
  /**
   * Get all scripts for user with filters
   */
  async getScripts(
    userId: string,
    filters?: {
      status?: string;
      sourceType?: string;
      search?: string;
    }
  ) {
    const scripts = await repo.getScriptsByUserId(userId, filters);
    return scripts;
  },

  /**
   * Get a single script by ID
   */
  async getScriptById(scriptId: string, userId: string) {
    const script = await repo.getScriptById(scriptId, userId);

    if (!script) {
      throw new ScriptNotFoundError();
    }

    return script;
  },

  /**
   * Find a script by source ID and source type
   */
  async findBySource(userId: string, sourceId: string, sourceType: string) {
    const script = await repo.findBySource(userId, sourceId, sourceType);
    return script;
  },

  /**
   * Get all versions of a script
   */
  async getScriptVersions(scriptId: string, userId: string) {
    const versions = await repo.getScriptVersions(scriptId, userId);
    return versions;
  },

  /**
   * Create a new version of a script
   */
  async createScriptVersion(scriptId: string, userId: string) {
    const originalScript = await repo.getScriptById(scriptId, userId);
    
    if (!originalScript) {
      throw new ScriptNotFoundError();
    }

    // Создаем новую версию с данными из оригинального скрипта
    const newVersion = await repo.createScriptVersion(scriptId, userId, {
      title: originalScript.title,
      scenes: originalScript.scenes,
      fullText: originalScript.fullText,
      format: originalScript.format,
      durationSeconds: originalScript.durationSeconds,
      wordCount: originalScript.wordCount,
      aiScore: originalScript.aiScore,
      aiAnalysis: originalScript.aiAnalysis,
      aiRecommendations: originalScript.aiRecommendations,
      sourceType: originalScript.sourceType,
      sourceId: originalScript.sourceId,
      sourceTitle: originalScript.sourceTitle,
      sourceUrl: originalScript.sourceUrl,
    });

    if (!newVersion) {
      throw new ScriptValidationError("Failed to create new version");
    }

    logger.info("New script version created", {
      userId,
      scriptId,
      newVersionId: newVersion.id,
      versionNumber: newVersion.version,
    });

    return newVersion;
  },

  /**
   * Create a new script
   */
  async createScript(userId: string, data: any) {
    // Validate required fields
    if (!data.title || !data.scenes || !Array.isArray(data.scenes)) {
      throw new ScriptValidationError("Title and scenes are required");
    }

    const script = await repo.createScript(userId, data);
    return script;
  },

  /**
   * Update a script
   */
  async updateScript(scriptId: string, userId: string, data: any) {
    const script = await repo.updateScript(scriptId, userId, data);

    if (!script) {
      throw new ScriptNotFoundError();
    }

    return script;
  },

  /**
   * Delete a script
   */
  async deleteScript(scriptId: string, userId: string) {
    const script = await repo.deleteScript(scriptId, userId);

    if (!script) {
      throw new ScriptNotFoundError();
    }

    return script;
  },

  /**
   * Analyze a script using AI (EditorAgent - как в конвейере)
   */
  async analyzeScript(scriptId: string, userId: string) {
    const script = await repo.getScriptById(scriptId, userId);

    if (!script) {
      throw new ScriptNotFoundError();
    }

    // Get user's Anthropic API key
    const apiKey = await apiKeysService.getUserApiKey(userId, "anthropic");
    if (!apiKey) {
      throw new NoApiKeyConfiguredError("Anthropic");
    }

    // Используем EditorAgent как в конвейере
    const { EditorAgent } = await import("../generation/agents/editor-agent");
    const editorAgent = new EditorAgent();
    
    // Устанавливаем API ключ
    editorAgent.setApiKey(apiKey.decryptedKey);
    
    // Подготавливаем сцены в формате ScriptwriterOutput
    const scenes = Array.isArray(script.scenes)
      ? script.scenes.map((s: any, index: number) => ({
          number: s.order || s.sceneNumber || index + 1,
          text: s.text || "",
          visual: s.visual || s.visualSource || "Визуал не указан",
          duration: s.duration || 5,
        }))
      : [];

    const totalDuration = scenes.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);

    const scriptwriterOutput = {
      scenes,
      totalDuration,
    };

    // Вызываем EditorAgent
    const editorResult = await editorAgent.process({
      script: scriptwriterOutput,
      newsTitle: script.title || "Без названия",
      newsContent: script.sourceTitle || script.fullText || "",
      customPrompt: undefined,
    });

    // Конвертируем оценку из 10-балльной в 100-балльную
    const aiScore = Math.round((editorResult.overallScore / 10) * 100);

    // Сохраняем полный результат анализа
    const aiAnalysis = {
      overallScore: aiScore, // 0-100
      overallComment: editorResult.overallComment,
      verdict: editorResult.verdict,
      sceneComments: editorResult.sceneComments,
      // Оригинальная оценка 1-10 для справки
      rawScore: editorResult.overallScore,
    };

    // Update script with analysis (не меняем статус, только добавляем оценку)
    const updated = await repo.updateScript(scriptId, userId, {
      aiAnalysis,
      aiScore,
      analyzedAt: new Date(),
      // Статус не меняем - анализ это просто добавление оценки, не изменение состояния
    });

    logger.info("Script analyzed successfully", {
      scriptId,
      userId,
      aiScore,
      verdict: editorResult.verdict,
    });

    return updated;
  },

  /**
   * Start production from script (create project starting at Stage 4)
   */
  async startProduction(scriptId: string, userId: string, skipToStage = 4) {
    const script = await repo.getScriptById(scriptId, userId);

    if (!script) {
      throw new ScriptNotFoundError();
    }

    // Create project starting at specified stage
    const projectsService = new ProjectsService();
    const project = await projectsService.createProjectFromScript(
      userId,
      script,
      skipToStage
    );

    // Link script to project
    await repo.linkScriptToProject(scriptId, project.id);

    return project;
  },

  /**
   * Generate script from article and save to library
   */
  async generateScriptFromArticle(
    articleId: string,
    userId: string,
    format?: string,
    saveToLibrary = true
  ) {
    // Get article
    const items = await newsService.getRssItems(userId);
    const item = items.find((i) => i.id === articleId);

    if (!item) {
      throw new ArticleNotFoundError();
    }

    // Get user's Anthropic API key
    const apiKey = await apiKeysService.getUserApiKey(userId, "anthropic");
    if (!apiKey) {
      throw new NoApiKeyConfiguredError("Anthropic");
    }

    // Prepare content for script generation
    const content = item.content || item.title || "";
    const formatName =
      format === "news_update"
        ? "News Update"
        : format === "explainer"
        ? "Explainer"
        : format === "hook_story"
        ? "Hook & Story"
        : "News Update";

    // Generate script
    const scriptResult = await analyzeScript(
      apiKey.decryptedKey,
      formatName,
      content
    );

    if (!saveToLibrary) {
      return { generated: scriptResult, script: null };
    }

    // Convert scenes to proper format
    const scenes = scriptResult.scenes.map((s: any, index: number) => ({
      sceneNumber: s.sceneNumber || index + 1,
      text: s.text || s.current || "",
      start: s.start || 0,
      end: s.end || (s.duration || 5),
      duration: s.duration || 5,
    }));

    // Save to library
    const script = await repo.createScript(userId, {
      title: item.title,
      scenes,
      fullText: scenes.map((s: any) => s.text).join("\n"),
      format: format || "news_update",
      durationSeconds: scenes.reduce(
        (sum: number, s: any) => sum + (s.duration || 0),
        0
      ),
      wordCount: scenes.reduce(
        (sum: number, s: any) => sum + (s.text?.split(/\s+/).length || 0),
        0
      ),
      sourceType: "rss",
      sourceId: item.id,
      sourceTitle: item.title,
      sourceUrl: item.url,
      status: "ready",
      aiScore: scriptResult.overallScore,
    });

    return { script, generated: scriptResult };
  },

  /**
   * Generate script variants from source text using AI
   */
  async generateVariants(
    userId: string,
    sourceText: string,
    format: string,
    prompt?: string,
    lengthOption: 'keep' | 'increase' | 'decrease' = 'keep'
  ) {
    if (!sourceText || !format) {
      throw new ScriptValidationError("sourceText and format are required");
    }

    // Get user's Anthropic API key
    const apiKey = await apiKeysService.getUserApiKey(userId, "anthropic");
    if (!apiKey) {
      throw new NoApiKeyConfiguredError("Anthropic");
    }

    // Calculate source text word count for length reference
    const sourceWordCount = sourceText.split(/\s+/).length;
    
    // Calculate target word count based on length option
    let targetWordCount: number;
    let targetRange: string;
    let lengthInstruction: string;
    
    switch (lengthOption) {
      case 'decrease':
        targetWordCount = Math.max(5, Math.round(sourceWordCount * 0.7));
        targetRange = `${targetWordCount - 2}-${targetWordCount + 2}`;
        lengthInstruction = `Сделай текст КОРОЧЕ - примерно ${targetWordCount} слов (70% от оригинала).`;
        break;
      case 'increase':
        targetWordCount = Math.round(sourceWordCount * 1.3);
        targetRange = `${targetWordCount - 3}-${targetWordCount + 3}`;
        lengthInstruction = `Сделай текст ДЛИННЕЕ - примерно ${targetWordCount} слов (130% от оригинала). Добавь больше деталей и эмоций.`;
        break;
      case 'keep':
      default:
        targetWordCount = sourceWordCount;
        targetRange = `${sourceWordCount - 3}-${sourceWordCount + 3}`;
        lengthInstruction = `Сохрани длину текста - примерно ${sourceWordCount} слов (±3 слова).`;
        break;
    }
    
    // Build enhanced prompt with length preservation
    const enhancedPrompt = [
      `⚠️⚠️⚠️ КРИТИЧЕСКИ ВАЖНО - ИГНОРИРУЙ БАЗОВЫЕ ПРАВИЛА О ДЛИНЕ! ⚠️⚠️⚠️`,
      ``,
      `📊 ПАРАМЕТРЫ ДЛИНЫ (ОБЯЗАТЕЛЬНО К ИСПОЛНЕНИЮ):`,
      `• Исходный текст: ${sourceWordCount} слов`,
      `• ${lengthInstruction}`,
      `• Целевой диапазон: ${targetRange} слов`,
      `• НЕ короче ${targetWordCount - 3} слов!`,
      ``,
      `🚫 ЗАПРЕЩЕНО:`,
      `• Применять правило "5-15 слов" - ИГНОРИРУЙ ЕГО!`,
      `• Укорачивать для "краткости" - НЕТ!`,
      lengthOption === 'decrease' ? `` : `• Удалять детали - сохрани информацию!`,
      ``,
      `✅ ДЕЙСТВИЯ:`,
      lengthOption === 'decrease' ? `• Убери воду, оставь факты и суть` : '',
      lengthOption === 'increase' ? `• Добавь: цифры, примеры, детали, эмоции` : '',
      lengthOption === 'keep' ? `• Переформулируй, но сохрани всю информацию` : '',
      `• Считай слова в процессе написания!`,
      `• Если не хватает до цели - добавь деталей!`,
      ``,
      prompt ? `📝 Дополнительно: ${prompt}` : ''
    ].filter(Boolean).join('\n');

    console.log(`[generateVariants] Source: ${sourceWordCount} words, Option: ${lengthOption}, Target: ${targetWordCount} words`);
    console.log(`[generateVariants] Enhanced prompt:`, enhancedPrompt);

    // Generate script with variants
    const analysis = await analyzeScript(
      apiKey.decryptedKey,
      format,
      sourceText,
      enhancedPrompt
    );

    // Transform to frontend format
    const scenes = analysis.scenes.map((scene: any, index: number) => ({
      id: String(index + 1),
      type:
        index === 0
          ? "hook"
          : index === analysis.scenes.length - 1
          ? "cta"
          : "body",
      text: scene.text || scene.current || "",
    }));

    const variants: Record<
      number,
      Array<{ id: string; text: string; score?: number }>
    > = {};

    analysis.scenes.forEach((scene: any, index: number) => {
      // Get variants from scene.variants array
      const sceneVariants = scene.variants || [];

      variants[index] = sceneVariants.map((variant: string, vIndex: number) => ({
        id: `v${index}-${String.fromCharCode(65 + vIndex)}`,
        text: variant,
        score: scene.score,
      }));

      // If no variants, use main text as first variant and create 2 more from recommendations
      if (variants[index].length === 0) {
        variants[index] = [
          {
            id: `v${index}-A`,
            text: scene.text || scene.current || "",
            score: scene.score,
          },
        ];

        // Add recommendations as variants if available
        const sceneRecommendations =
          analysis.recommendations?.filter(
            (r: any) => r.sceneNumber === index + 1
          ) || [];
        sceneRecommendations.slice(0, 2).forEach((rec: any, rIndex: number) => {
          if (rec.suggested && rec.suggested !== scene.text) {
            variants[index].push({
              id: `v${index}-${String.fromCharCode(66 + rIndex)}`,
              text: rec.suggested,
              score:
                (scene.score || 50) +
                parseInt(rec.expectedImpact?.replace(/[^0-9]/g, "") || "10"),
            });
          }
        });
      }
    });

    // Log generated variants length for debugging
    console.log(`[generateVariants] Generated variants summary:`);
    Object.keys(variants).forEach((sceneIndex) => {
      const sceneVariants = variants[Number(sceneIndex)];
      sceneVariants.forEach((v, idx) => {
        const wordCount = v.text.split(/\s+/).length;
        console.log(`  Scene ${sceneIndex}, Variant ${idx + 1}: ${wordCount} words - "${v.text.substring(0, 50)}..."`);
      });
    });

    return {
      scenes,
      variants,
    };
  },

  // ============================================================================
  // CHECKPOINT & EDITOR STATE MANAGEMENT
  // ============================================================================

  /**
   * Save working state (не создаёт версию, только обновляет рабочее состояние)
   */
  async saveWorkingState(scriptId: string, userId: string, data: {
    scenes: any[];
    fullText: string;
    editorState: any;
  }) {
    const script = await repo.saveWorkingState(scriptId, userId, {
      scenes: data.scenes,
      fullText: data.fullText,
      editorState: data.editorState,
    });

    if (!script) {
      throw new ScriptNotFoundError();
    }

    logger.info("Script working state saved", {
      userId,
      scriptId,
      scenesCount: data.scenes.length,
    });

    return {
      success: true,
      script,
      message: "Рабочее состояние сохранено",
    };
  },

  /**
   * Create checkpoint (автоматически при определённых условиях)
   */
  async createCheckpoint(scriptId: string, userId: string, reason: string, currentState: {
    scenes: any[];
    fullText: string;
    metadata?: any;
  }) {
    // Проверить что скрипт существует
    const script = await repo.getScriptById(scriptId, userId);
    if (!script) {
      throw new ScriptNotFoundError();
    }

    const checkpoint = await repo.createCheckpoint({
      scriptId,
      userId,
      reason,
      scenes: currentState.scenes,
      fullText: currentState.fullText,
      metadata: currentState.metadata || {},
    });

    logger.info("Checkpoint created", {
      userId,
      scriptId,
      checkpointId: checkpoint.id,
      reason,
    });

    return checkpoint;
  },

  /**
   * Restore from checkpoint (UI для recovery)
   */
  async restoreFromCheckpoint(scriptId: string, checkpointId: string, userId: string) {
    // Получить checkpoint
    const checkpoint = await repo.getCheckpointById(checkpointId, userId);
    if (!checkpoint) {
      throw new ScriptValidationError("Checkpoint not found");
    }

    // Проверить что checkpoint принадлежит этому скрипту
    if (checkpoint.scriptId !== scriptId) {
      throw new ScriptValidationError("Checkpoint does not belong to this script");
    }

    // Восстановить данные из checkpoint
    const script = await repo.saveWorkingState(scriptId, userId, {
      scenes: checkpoint.scenes as any[],
      fullText: checkpoint.fullText,
      editorState: {
        lastEditedAt: new Date().toISOString(),
        lastEditedSceneId: (checkpoint.metadata as any)?.editingSceneId || null,
        restoredFrom: checkpointId,
        restoredAt: new Date().toISOString(),
      },
    });

    if (!script) {
      throw new ScriptNotFoundError();
    }

    logger.info("Script restored from checkpoint", {
      userId,
      scriptId,
      checkpointId,
      reason: checkpoint.reason,
    });

    return script;
  },

  /**
   * Check for recoverable checkpoints (при открытии редактора)
   */
  async checkForRecoverableCheckpoints(scriptId: string, userId: string) {
    const script = await repo.getScriptById(scriptId, userId);
    if (!script) {
      throw new ScriptNotFoundError();
    }

    // Получить checkpoint'ы с reason 'exit' или 'ttl'
    const checkpoints = await repo.getCheckpointsByReason(scriptId, userId, ['exit', 'ttl']);

    // Фильтровать только свежие (не старше 7 дней)
    const now = new Date();
    const recoverableCheckpoints = checkpoints.filter(cp => {
      const age = now.getTime() - new Date(cp.createdAt).getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      return age < sevenDaysMs;
    });

    return {
      hasCheckpoints: recoverableCheckpoints.length > 0,
      checkpoints: recoverableCheckpoints.map(cp => ({
        id: cp.id,
        reason: cp.reason,
        createdAt: cp.createdAt,
        metadata: cp.metadata,
      })),
    };
  },

  /**
   * Log editor operation (вызывается из разных мест)
   */
  async logEditorOperation(scriptId: string, userId: string, operation: {
    operationType: string;
    sceneId?: string;
    details?: any;
  }) {
    const log = await repo.logOperation({
      scriptId,
      userId,
      operationType: operation.operationType,
      sceneId: operation.sceneId,
      details: operation.details,
    });

    return log;
  },

  /**
   * Get operation log (для debugging)
   */
  async getOperationLog(scriptId: string, userId: string, limit?: number) {
    const script = await repo.getScriptById(scriptId, userId);
    if (!script) {
      throw new ScriptNotFoundError();
    }

    const logs = await repo.getOperationLog(scriptId, userId, limit);
    return logs;
  },

  /**
   * Delete expired checkpoints (для cron job)
   */
  async deleteExpiredCheckpoints() {
    const deletedCount = await repo.deleteExpiredCheckpoints();
    logger.info(`Deleted ${deletedCount} expired checkpoints`);
    return deletedCount;
  },

  /**
   * Autosave scene text (called from beacon on page unload)
   * Works with both scripts_library and auto_scripts
   */
  async autosaveScene(
    scriptId: string,
    sceneId: string,
    text: string,
    userId: string
  ) {
    // Try to find script in scripts_library first
    let script = await repo.getScriptById(scriptId, userId);
    
    if (script) {
      // Update scene in scripts_library
      const scenes = Array.isArray(script.scenes) ? script.scenes : [];
      const updatedScenes = scenes.map((scene: any) =>
        scene.id === sceneId ? { ...scene, text } : scene
      );

      await repo.updateScript(scriptId, userId, { scenes: updatedScenes });
      
      logger.info("[Autosave] Saved to scripts_library", {
        userId,
        scriptId,
        sceneId,
      });

      return { success: true, source: "scripts_library" };
    }

    // Try auto_scripts
    const { AutoScriptsRepo } = await import("../auto-scripts/auto-scripts.repo");
    const autoScriptsRepo = new AutoScriptsRepo();
    const autoScript = await autoScriptsRepo.getById(scriptId);

    if (autoScript && autoScript.userId === userId) {
      // Update scene in auto_scripts
      const autoScenes = Array.isArray(autoScript.scenes) ? autoScript.scenes : [];
      const updatedScenes = autoScenes.map((scene: any) =>
        scene.id === sceneId ? { ...scene, text } : scene
      );

      await autoScriptsRepo.update(scriptId, { scenes: updatedScenes });

      logger.info("[Autosave] Saved to auto_scripts", {
        userId,
        scriptId,
        sceneId,
      });

      return { success: true, source: "auto_scripts" };
    }

    throw new ScriptNotFoundError();
  },
};
