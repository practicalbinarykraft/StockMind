/**
 * Writer Agent (#5)
 * Writes the actual script based on analysis and architecture
 * Uses AI to generate scenes
 */
import { BaseAIAgent, type AgentContext } from "./base-agent";
import type {
  SourceData,
  AnalysisData,
  ArchitectureData,
  ScriptData,
  ScriptScene,
  RejectionPatterns,
  RevisionContext,
  StylePreferences,
  DurationRange,
  UserWritingContext,
  EnhancedRevisionContext,
  PreviousVersionData,
} from "../types";
import Anthropic from "@anthropic-ai/sdk";

export interface WriterInput {
  source: SourceData;
  analysis: AnalysisData;
  architecture: ArchitectureData;
  rejectionPatterns?: RejectionPatterns;
  revisionContext?: EnhancedRevisionContext;
  // Phase 1: Style customization
  stylePreferences?: StylePreferences;
  customGuidelines?: string[];
  // Phase 2: Custom prompt
  customPrompt?: string;
  // Phase 3: Script examples
  scriptExamples?: string[];
  // User writing profile (from feedback learning)
  userWritingContext?: UserWritingContext;
}

export interface WriterOutput {
  script: ScriptData;
}

export class WriterAgent extends BaseAIAgent<WriterInput, WriterOutput> {
  protected name = "Writer";
  protected stage = 5;
  protected estimatedCost = 0.02;

  protected validate(input: WriterInput): { valid: boolean; error?: string } {
    if (!input.source || !input.analysis || !input.architecture) {
      return { valid: false, error: "Source, analysis, and architecture required" };
    }
    return { valid: true };
  }

  protected async execute(input: WriterInput, context: AgentContext): Promise<WriterOutput> {
    const { source, analysis, architecture, rejectionPatterns, revisionContext } = input;

    if (revisionContext) {
      this.emitThinking(context, `Переписываю сценарий по замечаниям (попытка ${revisionContext.attempt})...`);
    } else {
      this.emitThinking(context, `Пишу сценарий в формате "${architecture.formatName}"...`);
    }

    const client = new Anthropic({ apiKey: context.apiKey });
    const prompt = revisionContext
      ? this.buildRevisionPrompt(input, revisionContext)
      : this.buildPrompt(input);

    this.emitThinking(context, "Генерирую сцены и текст для озвучки...");

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3072,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const script = this.parseResponse(content.text, architecture);

    this.emitThinking(context, `Сценарий готов! ${script.scenes.length} сцен, ~${script.estimatedDuration}с`);

    return { script };
  }

  private buildPrompt(input: WriterInput): string {
    const { source, analysis, architecture, rejectionPatterns, stylePreferences, customGuidelines, customPrompt, scriptExamples, userWritingContext } = input;

    // Phase 2: If user provided custom prompt, use it with variable substitution
    if (customPrompt) {
      return this.buildCustomPrompt(customPrompt, input);
    }

    const avoidInstructions = this.buildAvoidInstructions(rejectionPatterns);
    const styleInstructions = this.buildStyleInstructions(stylePreferences);
    const guidelinesInstructions = this.buildGuidelinesInstructions(customGuidelines);
    const scriptExamplesSection = this.buildScriptExamplesSection(scriptExamples);
    const userProfileInstructions = this.buildUserProfileInstructions(userWritingContext);
    const language = stylePreferences?.language || 'ru';

    // Use default structure if structureTemplate is missing
    const template = architecture.structureTemplate || {
      hook: { duration: 5, purpose: "Захват внимания" },
      context: { duration: 10, purpose: "Контекст" },
      main: { duration: 35, purpose: "Основной контент" },
      twist: { duration: 10, purpose: "Поворот" },
      cta: { duration: 5, purpose: "Призыв" },
    };

    return `Ты профессиональный сценарист вирусных видео. Напиши сценарий.
${styleInstructions}
${guidelinesInstructions}
${scriptExamplesSection}
${userProfileInstructions}
ФОРМАТ: ${architecture.formatName}
СТРУКТУРА: hook(${template.hook.duration}с) → context(${template.context.duration}с) → main(${template.main.duration}с) → twist(${template.twist.duration}с) → cta(${template.cta.duration}с)

ИСПОЛЬЗУЙ ЭТОТ ХУК:
"${architecture.suggestedHooks[0]}"

ВКЛЮЧИ ЭТИ ФАКТЫ:
${analysis.keyFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

УГОЛ ПОДАЧИ: ${analysis.uniqueAngle}

ЭМОЦИИ ДЛЯ ВЫЗОВА: ${analysis.emotionalAngles.join(", ")}

ЦЕЛЕВАЯ АУДИТОРИЯ: ${analysis.targetAudience.join(", ")}
${avoidInstructions}

ИСХОДНЫЙ МАТЕРИАЛ:
${source.content.substring(0, 3000)}

${language === 'en' ? 'Write the script in ENGLISH.' : 'Пиши сценарий на РУССКОМ языке.'}

Напиши сценарий. Ответь ТОЛЬКО JSON:
{
  "scenes": [
    {"id": 1, "label": "hook", "text": "Текст для озвучки", "start": 0, "end": 5, "visualNotes": "Заметки для визуала"},
    {"id": 2, "label": "context", "text": "...", "start": 5, "end": 15, "visualNotes": "..."},
    {"id": 3, "label": "main", "text": "...", "start": 15, "end": 50, "visualNotes": "..."},
    {"id": 4, "label": "twist", "text": "...", "start": 50, "end": 60, "visualNotes": "..."},
    {"id": 5, "label": "cta", "text": "...", "start": 60, "end": 65, "visualNotes": "..."}
  ],
  "fullScript": "Полный текст сценария единым текстом",
  "estimatedDuration": 65
}`;
  }

  private buildRevisionPrompt(input: WriterInput, revision: EnhancedRevisionContext): string {
    const { source, analysis, architecture, rejectionPatterns, userWritingContext } = input;
    const avoidInstructions = this.buildAvoidInstructions(rejectionPatterns);
    const userProfileInstructions = this.buildUserProfileInstructions(userWritingContext);
    const previousVersionsSection = this.buildPreviousVersionsSection(revision.previousVersions);

    // Get the current script from the last version
    const lastVersion = revision.previousVersions?.[revision.previousVersions.length - 1];
    const currentScenes = lastVersion?.scenes || [];
    const currentScript = lastVersion?.fullScript || "";

    // Use default structure if structureTemplate is missing
    const template = architecture.structureTemplate || {
      hook: { duration: 5, purpose: "Захват внимания" },
      context: { duration: 10, purpose: "Контекст" },
      main: { duration: 35, purpose: "Основной контент" },
      twist: { duration: 10, purpose: "Поворот" },
      cta: { duration: 5, purpose: "Призыв" },
    };

    // Build scenes section with current text
    const scenesWithText = currentScenes.length > 0
      ? currentScenes.map((s: any) => `Сцена ${s.id} (${s.label}): "${s.text}"`).join("\n")
      : "Сцены не найдены";

    // Check if specific scenes were selected for editing
    const hasSelectedScenes = revision.selectedSceneIds && revision.selectedSceneIds.length > 0;
    const selectedSceneIds = revision.selectedSceneIds || [];

    const sceneLabels: Record<number, string> = {
      1: "hook",
      2: "context",
      3: "main",
      4: "twist",
      5: "cta",
    };

    // Build targeted editing instructions
    let editingInstructions = "";
    if (hasSelectedScenes) {
      const selectedLabels = selectedSceneIds.map((id: number) => `${id} (${sceneLabels[id] || "unknown"})`);
      editingInstructions = `
⚠️ КРИТИЧЕСКИ ВАЖНО - ТОЧЕЧНОЕ РЕДАКТИРОВАНИЕ:
Пользователь указал, что нужно изменить ТОЛЬКО сцены: ${selectedLabels.join(", ")}

ПРАВИЛА:
1. Сцены которые НЕ указаны для редактирования - СКОПИРУЙ БЕЗ ИЗМЕНЕНИЙ (слово в слово!)
2. Изменяй ТОЛЬКО указанные сцены согласно замечаниям
3. НЕ трогай начало если пользователь просил изменить только концовку
4. НЕ трогай концовку если пользователь просил изменить только начало
5. Если пользователь написал что часть сценария хорошая - сохрани её ТОЧНО как есть

ТЕКУЩИЙ СЦЕНАРИЙ (скопируй неизменяемые части):
${scenesWithText}`;
    } else {
      editingInstructions = `
ТЕКУЩИЙ СЦЕНАРИЙ:
${scenesWithText}

ВАЖНО: Внимательно прочитай замечания пользователя.
- Если пользователь говорит что какая-то часть хорошая - НЕ МЕНЯЙ её!
- Изменяй ТОЛЬКО то, что пользователь явно просит изменить
- Сохраняй хорошие части ДОСЛОВНО`;
    }

    return `Внеси точечные правки в сценарий по замечаниям пользователя.

ЗАМЕЧАНИЯ ПОЛЬЗОВАТЕЛЯ:
"${revision.notes}"
${editingInstructions}
${previousVersionsSection}
ФОРМАТ: ${architecture.formatName}
СТРУКТУРА: hook(${template.hook.duration}с) → context(${template.context.duration}с) → main(${template.main.duration}с) → twist(${template.twist.duration}с) → cta(${template.cta.duration}с)
${avoidInstructions}
${userProfileInstructions}

ИСХОДНЫЙ МАТЕРИАЛ (для контекста):
${source.content.substring(0, 1500)}

Ответь ТОЛЬКО JSON:
{
  "scenes": [
    {"id": 1, "label": "hook", "text": "Текст для озвучки", "start": 0, "end": 5, "visualNotes": "Заметки для визуала"},
    {"id": 2, "label": "context", "text": "...", "start": 5, "end": 15, "visualNotes": "..."},
    {"id": 3, "label": "main", "text": "...", "start": 15, "end": 50, "visualNotes": "..."},
    {"id": 4, "label": "twist", "text": "...", "start": 50, "end": 60, "visualNotes": "..."},
    {"id": 5, "label": "cta", "text": "...", "start": 60, "end": 65, "visualNotes": "..."}
  ],
  "fullScript": "Полный текст сценария единым текстом",
  "estimatedDuration": 65
}`;
  }

  private buildAvoidInstructions(patterns?: RejectionPatterns): string {
    if (!patterns || Object.keys(patterns).length === 0) {
      return "";
    }

    const instructions = Object.entries(patterns)
      .filter(([_, p]) => p.count >= 2)
      .map(([_, p]) => `- ${p.instruction}`)
      .join("\n");

    if (!instructions) return "";

    return `
⚠️ ОБЯЗАТЕЛЬНО ИЗБЕГАЙ (пользователь отклонял за это):
${instructions}`;
  }

  /**
   * Phase 1: Build style instructions based on user preferences
   */
  private buildStyleInstructions(prefs?: StylePreferences): string {
    if (!prefs) return "";

    const formalityMap: Record<string, string> = {
      formal: "Используй формальный, профессиональный стиль. Избегай сленга и разговорных выражений.",
      conversational: "Пиши разговорным стилем, как будто общаешься с другом. Используй простые предложения.",
      casual: "Пиши очень неформально, используй сленг, эмодзи и разговорные обороты.",
    };

    const toneMap: Record<string, string> = {
      serious: "Тон серьезный и информативный. Фокусируйся на фактах.",
      engaging: "Тон вовлекающий и энергичный. Задавай риторические вопросы.",
      funny: "Добавь юмор и легкость. Используй шутки и ироничные наблюдения.",
      motivational: "Тон мотивирующий и вдохновляющий. Призывай к действию.",
    };

    const formality = formalityMap[prefs.formality] || "";
    const tone = toneMap[prefs.tone] || "";

    if (!formality && !tone) return "";

    return `
📝 СТИЛЬ НАПИСАНИЯ:
${formality}
${tone}`;
  }

  /**
   * Phase 1: Build custom guidelines instructions
   */
  private buildGuidelinesInstructions(guidelines?: string[]): string {
    if (!guidelines || guidelines.length === 0) return "";

    return `
📋 ПОЛЬЗОВАТЕЛЬСКИЕ ТРЕБОВАНИЯ:
${guidelines.map((g, i) => `${i + 1}. ${g}`).join("\n")}`;
  }

  /**
   * Phase 3: Build script examples section from user's sample scripts
   * These are reference scripts that show the writing style the user prefers
   */
  private buildScriptExamplesSection(examples?: string[]): string {
    if (!examples || examples.length === 0) return "";

    const examplesText = examples
      .slice(0, 5) // Max 5 examples
      .map((ex, i) => `--- Образец ${i + 1} ---\n${ex.substring(0, 3000)}`) // Max 3000 chars each
      .join("\n\n");

    return `
📚 ОБРАЗЦЫ СЦЕНАРИЕВ (пиши в похожем стиле):
${examplesText}

ВАЖНО: Изучи эти образцы и пиши в похожем стиле и формате.
Твой текст должен быть ЧИСТЫМ текстом для озвучки - БЕЗ комментариев, БЕЗ эмодзи, БЕЗ пояснений.
Только готовый текст, который можно сразу отправить на озвучку.`;
  }

  /**
   * Build user profile instructions from learned preferences
   */
  private buildUserProfileInstructions(context?: UserWritingContext): string {
    if (!context) return "";

    const sections: string[] = [];

    // Add instructions from writing rules
    if (context.instructions && context.instructions.length > 0) {
      sections.push(`🎯 ПРАВИЛА СТИЛЯ ПОЛЬЗОВАТЕЛЯ:
${context.instructions.map((i) => `• ${i}`).join("\n")}`);
    }

    // Add avoid patterns
    if (context.avoidPatterns && context.avoidPatterns.length > 0) {
      sections.push(`🚫 ИЗБЕГАЙ (пользователь не любит):
${context.avoidPatterns.slice(0, 10).map((p) => `• ${p}`).join("\n")}`);
    }

    // Add prefer patterns
    if (context.preferPatterns && context.preferPatterns.length > 0) {
      sections.push(`✅ ИСПОЛЬЗУЙ (пользователь предпочитает):
${context.preferPatterns.slice(0, 10).map((p) => `• ${p}`).join("\n")}`);
    }

    // Add AI summary as context
    if (context.aiSummary) {
      const summaryLines = context.aiSummary.split("\n").slice(0, 5).join("\n");
      sections.push(`📝 КРАТКИЙ ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ:
${summaryLines}`);
    }

    if (sections.length === 0) return "";

    return `
🧠 ПЕРСОНАЛИЗАЦИЯ (на основе истории обратной связи):
${sections.join("\n\n")}`;
  }

  /**
   * Build previous versions section for revision context
   */
  private buildPreviousVersionsSection(versions?: PreviousVersionData[]): string {
    if (!versions || versions.length === 0) return "";

    const versionTexts = versions.slice(-3).map((v) => {
      return `--- Версия ${v.versionNumber} ---
Сценарий:
${v.fullScript.substring(0, 500)}${v.fullScript.length > 500 ? "..." : ""}

Замечания:
${v.feedbackText}`;
    });

    return `
📚 ИСТОРИЯ ПРЕДЫДУЩИХ ВЕРСИЙ:
${versionTexts.join("\n\n")}

Учитывай эту историю, чтобы не повторять ошибки предыдущих версий.
`;
  }


  /**
   * Phase 2: Build prompt from custom template with variable substitution
   */
  private buildCustomPrompt(template: string, input: WriterInput): string {
    const { source, analysis, architecture } = input;

    // Use default structure if structureTemplate is missing
    const structureTemplate = architecture.structureTemplate || {
      hook: { duration: 5, purpose: "Захват внимания" },
      context: { duration: 10, purpose: "Контекст" },
      main: { duration: 35, purpose: "Основной контент" },
      twist: { duration: 10, purpose: "Поворот" },
      cta: { duration: 5, purpose: "Призыв" },
    };

    // Define available variables
    const variables: Record<string, string> = {
      '{{FORMAT}}': architecture.formatName,
      '{{FORMAT_ID}}': architecture.formatId,
      '{{HOOK_DURATION}}': String(structureTemplate.hook.duration),
      '{{CONTEXT_DURATION}}': String(structureTemplate.context.duration),
      '{{MAIN_DURATION}}': String(structureTemplate.main.duration),
      '{{TWIST_DURATION}}': String(structureTemplate.twist.duration),
      '{{CTA_DURATION}}': String(structureTemplate.cta.duration),
      '{{TOTAL_DURATION}}': String(architecture.totalDuration),
      '{{SUGGESTED_HOOK}}': architecture.suggestedHooks[0] || "",
      '{{KEY_FACTS}}': analysis.keyFacts.map((f, i) => `${i + 1}. ${f}`).join("\n"),
      '{{UNIQUE_ANGLE}}': analysis.uniqueAngle,
      '{{EMOTIONAL_ANGLES}}': analysis.emotionalAngles.join(", "),
      '{{TARGET_AUDIENCE}}': analysis.targetAudience.join(", "),
      '{{MAIN_TOPIC}}': analysis.mainTopic,
      '{{SUB_TOPICS}}': analysis.subTopics.join(", "),
      '{{SOURCE_TITLE}}': source.title,
      '{{SOURCE_CONTENT}}': source.content.substring(0, 3000),
      '{{SOURCE_URL}}': source.url,
    };

    // Replace all variables in template
    let prompt = template;
    for (const [key, value] of Object.entries(variables)) {
      prompt = prompt.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    return prompt;
  }

  private parseResponse(text: string, architecture: ArchitectureData): ScriptData {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found");
      }

      const data = JSON.parse(jsonMatch[0]);

      const scenes: ScriptScene[] = (data.scenes || []).map((s: any, i: number) => ({
        id: s.id || i + 1,
        label: s.label || "main",
        text: s.text || "",
        start: s.start || 0,
        end: s.end || 0,
        visualNotes: s.visualNotes,
      }));

      const fullScript = data.fullScript || scenes.map((s) => s.text).join(" ");
      const estimatedDuration = data.estimatedDuration || architecture.totalDuration;

      return { scenes, fullScript, estimatedDuration };
    } catch (error) {
      // Return minimal fallback
      return {
        scenes: [
          { id: 1, label: "hook", text: "Parse error", start: 0, end: 5 },
        ],
        fullScript: "Parse error",
        estimatedDuration: 5,
      };
    }
  }
}

export const writerAgent = new WriterAgent();
