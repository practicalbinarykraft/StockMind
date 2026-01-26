import { ScriptsLibraryRepo } from "./scripts-library.repo";
import { logger } from "../../lib/logger";
import { analyzeScriptAdvanced } from "../../ai-services/advanced";
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
   * Analyze a script using AI
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

    // Convert scenes to text for analysis
    const scriptText = Array.isArray(script.scenes)
      ? script.scenes.map((s: any) => s.text || s).join("\n")
      : "";

    const analysis = await analyzeScriptAdvanced(
      apiKey.decryptedKey,
      scriptText,
      script.sourceType === "rss" ? "news" : "custom_script"
    );

    // Update script with analysis
    const updated = await repo.updateScript(scriptId, userId, {
      aiAnalysis: analysis,
      aiScore: analysis.overallScore,
      analyzedAt: new Date(),
      status: script.status === "draft" ? "analyzed" : script.status,
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
      `Исходный текст содержит ${sourceWordCount} слов.`,
      lengthInstruction,
      `Целевая длина: ${targetRange} слов.`,
      ``,
      lengthOption === 'decrease' ? `Сохрани суть, убери лишнее.` : '',
      lengthOption === 'increase' ? `Добавь конкретные детали, примеры, цифры.` : '',
      lengthOption === 'keep' ? `Сохраняй полноту, детальность и эмоциональность оригинала.` : '',
      ``,
      prompt ? `Дополнительные требования: ${prompt}` : ''
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
};
