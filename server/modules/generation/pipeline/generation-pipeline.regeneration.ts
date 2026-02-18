/**
 * Generation Pipeline — Regeneration (re-generate existing script)
 */
import { db } from "../../../db";
import { autoScripts } from "@shared/schema";
import { eq } from "drizzle-orm";
import { scriptwriterAgent, editorAgent } from "./../agents";
import type { EditorOutput } from "./../agents";
import { generationSSE } from "./../generation-sse";
import type {
  PipelineSettings,
  GenerationResult,
} from "./generation-pipeline.types";
import { getApiKey, getNewsById } from "./generation-pipeline.types";
import {
  saveRegeneratedScript,
  saveRegenerationReview,
} from "./generation-pipeline.repo";
import { completeRegeneration } from "./generation-pipeline.lifecycle";

export async function regenerateScript(
  userId: string,
  scriptId: string,
  customPrompt?: string,
): Promise<GenerationResult> {
  console.log(
    `[Pipeline] Регенерация сценария ${scriptId} для userId: ${userId}`,
  );

  try {
    const apiKey = await getApiKey(userId);
    if (!apiKey) throw new Error("API ключ Anthropic не настроен");

    scriptwriterAgent.setApiKey(apiKey);
    editorAgent.setApiKey(apiKey);

    const [script] = await db
      .select()
      .from(autoScripts)
      .where(eq(autoScripts.id, scriptId))
      .limit(1);

    if (!script) throw new Error(`Сценарий ${scriptId} не найден`);
    if (script.userId !== userId)
      throw new Error("Нет доступа к этому сценарию");

    const news = await getNewsById(script.sourceItemId);
    if (!news) throw new Error(`Источник для сценария не найден`);

    console.log(`[Pipeline] Регенерация для новости: ${news.title}`);

    const settings: PipelineSettings = {
      maxIterations: 3,
      minApprovalScore: 80,
      scriptwriterPrompt: customPrompt,
    };

    generationSSE.sendEvent(userId, {
      type: "regeneration_started",
      data: { scriptId, newsTitle: news.title, customPrompt: !!customPrompt },
    });

    const result = await runRegenerationIterations(
      userId,
      scriptId,
      news,
      settings,
    );
    return result;
  } catch (error: any) {
    console.error(`[Pipeline] Ошибка регенерации:`, error);
    generationSSE.sendEvent(userId, {
      type: "regeneration_error",
      data: { scriptId, error: error.message },
    });
    return { success: false, scriptId, error: error.message };
  }
}

async function runRegenerationIterations(
  userId: string,
  scriptId: string,
  news: any,
  settings: PipelineSettings,
): Promise<GenerationResult> {
  let currentIteration = 0;
  let previousReview: EditorOutput | null = null;
  const maxIterations = settings.maxIterations || 3;
  const minScore = settings.minApprovalScore || 80;

  while (currentIteration < maxIterations) {
    currentIteration++;
    console.log(
      `[Pipeline] Итерация регенерации ${currentIteration}/${maxIterations} для scriptId: ${scriptId}`,
    );

    try {
      generationSSE.sendEvent(userId, {
        type: "regeneration_progress",
        data: {
          scriptId,
          stage: "scriptwriter",
          iteration: currentIteration,
          message: `Генерация сценария (итерация ${currentIteration})...`,
        },
      });

      const scriptResult = await scriptwriterAgent.process({
        newsTitle: news.title,
        newsContent: news.content || news.fullContent || "",
        previousReview: previousReview
          ? {
              overallComment: previousReview.overallComment,
              sceneComments: previousReview.sceneComments,
            }
          : undefined,
        version: currentIteration,
        customPrompt: settings.scriptwriterPrompt,
        examples: settings.examples,
        stylePreferences: settings.stylePreferences,
        durationRange: settings.durationRange,
        onThinking: (content) => {
          generationSSE.sendEvent(userId, {
            type: "regeneration_thinking",
            data: { scriptId, agent: "scriptwriter", content },
          });
        },
      });

      await saveRegeneratedScript(scriptId, scriptResult, currentIteration);

      generationSSE.sendEvent(userId, {
        type: "regeneration_progress",
        data: {
          scriptId,
          stage: "editor",
          iteration: currentIteration,
          message: `Оценка сценария (итерация ${currentIteration})...`,
        },
      });

      const reviewResult = await editorAgent.process({
        script: scriptResult,
        newsTitle: news.title,
        newsContent: news.content || news.fullContent || "",
        customPrompt: settings.editorPrompt,
        minApprovalScore: minScore,
        onThinking: (content) => {
          generationSSE.sendEvent(userId, {
            type: "regeneration_thinking",
            data: { scriptId, agent: "editor", content },
          });
        },
      });

      const finalScore = reviewResult.overallScore;
      await saveRegenerationReview(scriptId, reviewResult, finalScore);

      if (
        reviewResult.verdict === "approved" ||
        reviewResult.overallScore >= minScore
      ) {
        await completeRegeneration(scriptId, finalScore, userId);
        generationSSE.sendEvent(userId, {
          type: "regeneration_completed",
          data: {
            scriptId,
            score: finalScore,
            iterations: currentIteration,
            verdict: "approved",
          },
        });
        console.log(`[Pipeline] Регенерация успешна: ${finalScore}/100`);
        return { success: true, scriptId, finalScore };
      }

      if (reviewResult.verdict === "rejected") {
        generationSSE.sendEvent(userId, {
          type: "regeneration_completed",
          data: {
            scriptId,
            score: finalScore,
            iterations: currentIteration,
            verdict: "rejected",
            message: "Сценарий отклонён редактором",
          },
        });
        console.log(`[Pipeline] Регенерация отклонена редактором`);
        return { success: false, scriptId, error: "Отклонён редактором" };
      }

      previousReview = reviewResult;
      console.log(
        `[Pipeline] Итерация ${currentIteration}: нужна доработка (${reviewResult.overallScore}/100)`,
      );
    } catch (error: any) {
      console.error(
        `[Pipeline] Ошибка в итерации регенерации ${currentIteration}:`,
        error,
      );
      generationSSE.sendEvent(userId, {
        type: "regeneration_error",
        data: { scriptId, error: error.message, iteration: currentIteration },
      });
      return { success: false, scriptId, error: error.message };
    }
  }

  generationSSE.sendEvent(userId, {
    type: "regeneration_completed",
    data: {
      scriptId,
      iterations: currentIteration,
      verdict: "max_iterations",
      message: "Достигнут лимит итераций",
    },
  });
  console.log(`[Pipeline] Регенерация: достигнут лимит итераций`);
  return { success: false, scriptId, error: "Достигнут лимит итераций" };
}
