/**
 * Generation Pipeline — DB Write Operations (create, save, update)
 */
import { db } from "../../../db";
import { autoScripts, conveyorItems, type AutoScript } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import type { ScriptwriterOutput, EditorOutput } from "./../agents";

export async function createAutoScript(
  userId: string,
  news: any,
): Promise<AutoScript> {
  console.log(
    `[Pipeline] createAutoScript called with newsId: ${news?.id}, userId: ${userId}`,
  );

  if (!news || !news.id) {
    throw new Error("News object is invalid or missing id");
  }

  const [existingScript] = await db
    .select()
    .from(autoScripts)
    .where(
      and(
        eq(autoScripts.userId, userId),
        eq(autoScripts.sourceItemId, news.id),
      ),
    )
    .limit(1);

  if (existingScript) {
    console.log(
      `[Pipeline] Сценарий для новости ${news.id} уже существует: ${existingScript.id}`,
    );
    throw new Error(
      `Сценарий для этой новости уже создан (ID: ${existingScript.id})`,
    );
  }

  const conveyorItemResult = await db
    .insert(conveyorItems)
    .values({
      userId,
      sourceType: "rss",
      sourceItemId: news.id,
      status: "processing",
      currentStage: 1,
    })
    .returning();

  const conveyorItem = conveyorItemResult[0];
  if (!conveyorItem) {
    throw new Error("Failed to create conveyor_item");
  }

  console.log(`[Pipeline] Создан conveyor_item: ${conveyorItem.id}`);

  const scriptResult = await db
    .insert(autoScripts)
    .values({
      userId,
      conveyorItemId: conveyorItem.id,
      sourceType: "rss",
      sourceItemId: news.id,
      title: news.title,
      scenes: [],
      fullScript: "",
      formatId: "viral_short",
      formatName: "Viral Short",
      status: "pending",
      gateDecision: "NEEDS_REVIEW",
      finalScore: 0,
    })
    .returning();

  const script = scriptResult[0];
  if (!script) {
    throw new Error("Failed to create auto_script");
  }

  console.log(`[Pipeline] Создан auto_script: ${script.id}`);
  return script;
}

export async function saveScriptVersion(
  scriptId: string,
  result: ScriptwriterOutput,
  iteration: number,
): Promise<void> {
  const scenes = result.scenes.map((s, i) => ({
    id: `scene-${scriptId}-${iteration}-${i}`,
    order: s.number,
    text: s.text,
    visual: s.visual,
    duration: s.duration,
    alternatives: [],
  }));

  const fullScript = result.scenes.map((s) => s.text).join("\n\n");

  await db
    .update(autoScripts)
    .set({ scenes: scenes as any, fullScript, revisionCount: iteration - 1 })
    .where(eq(autoScripts.id, scriptId));

  console.log(
    `[Pipeline] Сохранена версия ${iteration} для scriptId: ${scriptId}`,
  );
}

export async function saveReview(
  scriptId: string,
  result: EditorOutput,
  _iteration: number,
): Promise<void> {
  const finalScore = result.overallScore;

  await db
    .update(autoScripts)
    .set({
      finalScore,
      gateDecision:
        result.verdict === "approved"
          ? "PASS"
          : result.verdict === "rejected"
            ? "FAIL"
            : "NEEDS_REVIEW",
    })
    .where(eq(autoScripts.id, scriptId));

  console.log(
    `[Pipeline] Сохранена рецензия для scriptId: ${scriptId}, оценка: ${finalScore}/100`,
  );
}

export async function updateIteration(
  scriptId: string,
  iteration: number,
): Promise<void> {
  await db
    .update(autoScripts)
    .set({ revisionCount: iteration })
    .where(eq(autoScripts.id, scriptId));
}

export async function saveRegeneratedScript(
  scriptId: string,
  result: ScriptwriterOutput,
  iteration: number,
): Promise<void> {
  const scenes = result.scenes.map((s, i) => ({
    id: `scene-${scriptId}-regen-${iteration}-${i}`,
    order: s.number,
    text: s.text,
    visual: s.visual,
    duration: s.duration,
    alternatives: [],
  }));

  const fullScript = result.scenes.map((s) => s.text).join("\n\n");

  await db
    .update(autoScripts)
    .set({ scenes: scenes as any, fullScript, status: "revision" })
    .where(eq(autoScripts.id, scriptId));

  console.log(
    `[Pipeline] Сохранена регенерация итерации ${iteration} для scriptId: ${scriptId}`,
  );
}

export async function saveRegenerationReview(
  scriptId: string,
  result: EditorOutput,
  finalScore: number,
): Promise<void> {
  await db
    .update(autoScripts)
    .set({
      finalScore,
      gateDecision:
        result.verdict === "approved"
          ? "PASS"
          : result.verdict === "rejected"
            ? "FAIL"
            : "NEEDS_REVIEW",
    })
    .where(eq(autoScripts.id, scriptId));
}
