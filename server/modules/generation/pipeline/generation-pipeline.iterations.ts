/**
 * Generation Pipeline — Iteration Loops (scriptwriter ↔ editor)
 */
import { scriptwriterAgent, editorAgent } from "../agents";
import type { EditorOutput } from "../agents";
import { generationSSE } from "../generation-sse";
import type {
  PipelineSettings,
  GenerationResult,
} from "./generation-pipeline.types";
import {
  saveScriptVersion,
  saveReview,
  updateIteration,
} from "./generation-pipeline.repo";
import {
  completeScript,
  markForHumanReview,
} from "./generation-pipeline.lifecycle";

export async function runIterations(
  userId: string,
  scriptId: string,
  news: any,
  settings: PipelineSettings,
  refreshStats: () => Promise<void>,
): Promise<GenerationResult> {
  let currentIteration = 0;
  let previousReview: EditorOutput | null = null;

  const maxIterations = settings.maxIterations || 3;
  const minScore = settings.minApprovalScore || 80;

  while (currentIteration < maxIterations) {
    if (!generationSSE.isRunning(userId)) {
      await markForHumanReview(scriptId, userId);
      return { success: false, scriptId, error: "Остановлено пользователем" };
    }

    currentIteration++;
    console.log(
      `[Pipeline] Итерация ${currentIteration}/${maxIterations} для scriptId: ${scriptId}`,
    );

    try {
      generationSSE.scriptwriterStarted(userId, scriptId, currentIteration);

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
          generationSSE.scriptwriterThinking(scriptId, content);
        },
      });

      await saveScriptVersion(scriptId, scriptResult, currentIteration);
      generationSSE.scriptwriterCompleted(
        userId,
        scriptId,
        scriptResult.scenes.length,
      );

      generationSSE.editorStarted(userId, scriptId, currentIteration);

      const reviewResult = await editorAgent.process({
        script: scriptResult,
        newsTitle: news.title,
        newsContent: news.content || news.fullContent || "",
        customPrompt: settings.editorPrompt,
        minApprovalScore: minScore,
        onThinking: (content) => {
          generationSSE.editorThinking(scriptId, content);
        },
      });

      await saveReview(scriptId, reviewResult, currentIteration);
      generationSSE.editorCompleted(
        userId,
        scriptId,
        reviewResult.overallScore,
        reviewResult.verdict,
      );

      if (
        reviewResult.verdict === "approved" ||
        reviewResult.overallScore >= minScore
      ) {
        const finalScore = reviewResult.overallScore;
        await completeScript(scriptId, finalScore, userId);
        generationSSE.scriptCompleted(userId, scriptId, finalScore);
        console.log(`[Pipeline] Сценарий одобрен с оценкой ${finalScore}/100`);
        await refreshStats();
        return { success: true, scriptId, finalScore };
      }

      if (reviewResult.verdict === "rejected") {
        await markForHumanReview(scriptId, userId);
        console.log(`[Pipeline] Сценарий отклонен редактором`);
        await refreshStats();
        return { success: false, scriptId, error: "Отклонён редактором" };
      }

      previousReview = reviewResult;
      await updateIteration(scriptId, currentIteration);
    } catch (error: any) {
      console.error(`[Pipeline] Ошибка в итерации ${currentIteration}:`, error);
      await markForHumanReview(scriptId, userId);
      generationSSE.scriptError(userId, scriptId, error.message);
      await refreshStats();
      return { success: false, scriptId, error: error.message };
    }
  }

  await markForHumanReview(scriptId, userId);
  console.log(`[Pipeline] Достигнут лимит итераций для scriptId: ${scriptId}`);
  await refreshStats();
  return { success: false, scriptId, error: "Достигнут лимит итераций" };
}
