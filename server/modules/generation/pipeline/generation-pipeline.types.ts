/**
 * Generation Pipeline — Types & Shared State
 */
import { apiKeysService } from "../../api-keys/api-keys.service";
import { db } from "../../../db";
import { rssItems, autoScripts } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export interface StylePreferences {
  formality: "formal" | "conversational" | "casual";
  tone: "serious" | "engaging" | "funny" | "motivational";
  language: "ru" | "en";
}

export interface DurationRange {
  min: number;
  max: number;
}

export interface PipelineSettings {
  maxIterations: number;
  minApprovalScore: number;
  scriptwriterPrompt?: string;
  editorPrompt?: string;
  examples?: Array<{ content: string }>;
  stylePreferences?: StylePreferences;
  durationRange?: DurationRange;
}

export interface GenerationResult {
  success: boolean;
  scriptId?: string;
  finalScore?: number;
  error?: string;
}

export const activeGenerations = new Map<
  string,
  { userId: string; abortController: AbortController }
>();

export async function getApiKey(userId: string): Promise<string | null> {
  try {
    const apiKey = await apiKeysService.getUserApiKey(userId, "anthropic");
    return apiKey.decryptedKey;
  } catch {
    return null;
  }
}

export async function getNewsById(newsId: string): Promise<any | null> {
  const [news] = await db
    .select()
    .from(rssItems)
    .where(eq(rssItems.id, newsId))
    .limit(1);
  return news || null;
}

export async function getStats(
  userId: string,
): Promise<{
  parsed: number;
  analyzed: number;
  scriptsWritten: number;
  inReview: number;
}> {
  const [newsStats] = await db
    .select({
      total: sql<number>`count(*)`,
      analyzed: sql<number>`count(*) filter (where ${rssItems.aiScore} is not null)`,
    })
    .from(rssItems);

  const [scriptStats] = await db
    .select({
      total: sql<number>`count(*)`,
      pending: sql<number>`count(*) filter (where ${autoScripts.status} = 'pending')`,
    })
    .from(autoScripts)
    .where(eq(autoScripts.userId, userId));

  return {
    parsed: Number(newsStats?.total || 0),
    analyzed: Number(newsStats?.analyzed || 0),
    scriptsWritten: Number(scriptStats?.total || 0),
    inReview: Number(scriptStats?.pending || 0),
  };
}
