/**
 * Generation Pipeline — Script Lifecycle (complete, mark for review, versioning)
 */
import { db } from "../../../db";
import { autoScripts, conveyorItems } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { conveyorSettingsService } from "../../conveyor-settings/conveyor-settings.service";
import { AutoScriptsRepo } from "../../auto-scripts/auto-scripts.repo";

export async function completeScript(
  scriptId: string,
  finalScore: number,
  userId: string,
): Promise<void> {
  await db
    .update(autoScripts)
    .set({ status: "pending", gateDecision: "PASS", finalScore })
    .where(eq(autoScripts.id, scriptId));

  await createInitialVersion(scriptId, userId);

  await conveyorSettingsService.incrementDailyCount(userId);
  await conveyorSettingsService.incrementPassed(userId);
  await conveyorSettingsService.addCost(userId, 0.05);

  console.log(
    `[Pipeline] Сценарий ${scriptId} завершен с оценкой ${finalScore}/100, счетчик увеличен`,
  );
}

export async function markForHumanReview(
  scriptId: string,
  userId?: string,
): Promise<void> {
  await db
    .update(autoScripts)
    .set({ status: "pending", gateDecision: "NEEDS_REVIEW" })
    .where(eq(autoScripts.id, scriptId));

  if (userId) {
    await createInitialVersion(scriptId, userId);
    await conveyorSettingsService.incrementDailyCount(userId);
    await conveyorSettingsService.incrementFailed(userId);
    await conveyorSettingsService.addCost(userId, 0.05);
    console.log(
      `[Pipeline] Сценарий ${scriptId} отправлен на рецензию человека, счетчик увеличен`,
    );
  } else {
    console.log(
      `[Pipeline] Сценарий ${scriptId} отправлен на рецензию человека, счетчик НЕ увеличен (userId отсутствует)`,
    );
  }
}

export async function createInitialVersion(
  scriptId: string,
  userId: string,
): Promise<void> {
  try {
    const repo = new AutoScriptsRepo();

    const existingVersions = await repo.getScriptVersions(scriptId);
    if (existingVersions.length > 0) {
      console.log(
        `[Pipeline] Версии для скрипта ${scriptId} уже существуют, пропускаем создание`,
      );
      return;
    }

    const script = await repo.getById(scriptId);
    if (!script) {
      console.error(
        `[Pipeline] Скрипт ${scriptId} не найден, не могу создать версию`,
      );
      return;
    }

    await repo.createVersion(scriptId, userId, {
      title: script.title,
      scenes: script.scenes,
      fullScript: script.fullScript,
      finalScore: script.finalScore,
      hookScore: script.hookScore,
      structureScore: script.structureScore,
      emotionalScore: script.emotionalScore,
      ctaScore: script.ctaScore,
      feedbackText: "Исходная версия из конвейера",
    });

    console.log(
      `[Pipeline] Создана первая версия (из конвейера) для скрипта ${scriptId}`,
    );
  } catch (error: any) {
    console.error(
      `[Pipeline] Ошибка при создании первой версии для ${scriptId}:`,
      error.message,
    );
  }
}

export async function updateConveyorItemStatus(
  scriptId: string,
  status: "completed" | "failed",
): Promise<void> {
  const [script] = await db
    .select({ conveyorItemId: autoScripts.conveyorItemId })
    .from(autoScripts)
    .where(eq(autoScripts.id, scriptId));

  if (script?.conveyorItemId) {
    await db
      .update(conveyorItems)
      .set({ status, completedAt: new Date() })
      .where(eq(conveyorItems.id, script.conveyorItemId));
  }
}

export async function completeRegeneration(
  scriptId: string,
  finalScore: number,
  userId: string,
): Promise<void> {
  await db
    .update(autoScripts)
    .set({
      status: "pending",
      gateDecision: "PASS",
      finalScore,
      revisionCount: sql`${autoScripts.revisionCount} + 1`,
    })
    .where(eq(autoScripts.id, scriptId));

  const repo = new AutoScriptsRepo();
  const script = await repo.getById(scriptId);

  if (script) {
    await repo.createVersion(scriptId, userId, {
      title: script.title,
      scenes: script.scenes,
      fullScript: script.fullScript,
      finalScore: script.finalScore,
      hookScore: script.hookScore,
      structureScore: script.structureScore,
      emotionalScore: script.emotionalScore,
      ctaScore: script.ctaScore,
      feedbackText: "Регенерация AI",
      source: "conveyor",
    });
  }

  console.log(`[Pipeline] Регенерация завершена для scriptId: ${scriptId}`);
}
