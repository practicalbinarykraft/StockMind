import { pgTable, uuid, text, boolean, integer, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

// Enum типы
export const newsStatusEnum = pgEnum('news_status', ['new', 'scored', 'selected', 'used', 'dismissed']);
export const scriptStatusEnum = pgEnum('script_status', ['pending', 'in_progress', 'completed', 'human_review', 'approved', 'rejected']);
export const reviewVerdictEnum = pgEnum('review_verdict', ['needs_revision', 'approved', 'rejected']);
export const agentEnum = pgEnum('agent', ['scriptwriter', 'editor']);
export const llmProviderEnum = pgEnum('llm_provider', ['anthropic', 'deepseek']);

// 1. RSS Sources (RSS источники)
export const rssSources = pgTable('rss_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  url: text('url').notNull().unique(),
  isActive: boolean('is_active').default(true),
  lastFetchedAt: timestamp('last_fetched_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. News Items (Новости)
export const newsItems = pgTable('news_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  content: text('content'),
  fullContent: text('full_content'),
  source: text('source'),
  sourceUrl: text('source_url'),
  url: text('url'),
  imageUrl: text('image_url'),
  aiScore: integer('ai_score'),
  aiComment: text('ai_comment'),
  status: newsStatusEnum('status').default('new'),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
});

// 3. Scripts (Сценарии)
export const scripts = pgTable('scripts', {
  id: uuid('id').primaryKey().defaultRandom(),
  newsId: uuid('news_id').references(() => newsItems.id),
  newsTitle: text('news_title'),
  newsSource: text('news_source'),
  status: scriptStatusEnum('status').default('pending'),
  currentIteration: integer('current_iteration').default(0),
  maxIterations: integer('max_iterations').default(3),
  finalScore: integer('final_score'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
});

// 4. Iterations (Итерации)
export const iterations = pgTable('iterations', {
  id: uuid('id').primaryKey().defaultRandom(),
  scriptId: uuid('script_id').references(() => scripts.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. Script Versions (Версии сценария)
export const scriptVersions = pgTable('script_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  iterationId: uuid('iteration_id').references(() => iterations.id, { onDelete: 'cascade' }),
  scenes: jsonb('scenes').notNull().default([]),
  fullText: text('full_text'),
  generatedAt: timestamp('generated_at').defaultNow(),
  tokensUsed: integer('tokens_used'),
  cost: text('cost'),
});

// 6. Reviews (Рецензии)
export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  iterationId: uuid('iteration_id').references(() => iterations.id, { onDelete: 'cascade' }),
  overallScore: integer('overall_score'),
  overallComment: text('overall_comment'),
  sceneComments: jsonb('scene_comments').default([]),
  verdict: reviewVerdictEnum('verdict'),
  createdAt: timestamp('created_at').defaultNow(),
  tokensUsed: integer('tokens_used'),
  cost: text('cost'),
});

// 7. AI Settings (Настройки AI)
export const aiSettings = pgTable('ai_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: llmProviderEnum('provider').default('anthropic'),
  // API Keys (зашифрованные)
  anthropicApiKey: text('anthropic_api_key'), // encrypted
  anthropicApiKeyLast4: text('anthropic_api_key_last4'), // последние 4 символа
  deepseekApiKey: text('deepseek_api_key'), // encrypted
  deepseekApiKeyLast4: text('deepseek_api_key_last4'), // последние 4 символа
  // Промпты
  scriptwriterPrompt: text('scriptwriter_prompt'),
  editorPrompt: text('editor_prompt'),
  maxIterations: integer('max_iterations').default(3),
  minApprovalScore: integer('min_approval_score').default(8),
  autoSendToHumanReview: boolean('auto_send_to_human_review').default(true),
  examples: jsonb('examples').default([]),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 8. Generation Logs (Логи генерации)
export const generationLogs = pgTable('generation_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  scriptId: uuid('script_id').references(() => scripts.id),
  iterationId: uuid('iteration_id').references(() => iterations.id),
  agent: agentEnum('agent'),
  event: text('event'),
  message: text('message'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations (Связи между таблицами)

export const rssSourcesRelations = relations(rssSources, ({ many }) => ({
  newsItems: many(newsItems),
}));

export const newsItemsRelations = relations(newsItems, ({ one, many }) => ({
  rssSource: one(rssSources, {
    fields: [newsItems.sourceUrl],
    references: [rssSources.url],
  }),
  scripts: many(scripts),
}));

export const scriptsRelations = relations(scripts, ({ one, many }) => ({
  news: one(newsItems, {
    fields: [scripts.newsId],
    references: [newsItems.id],
  }),
  iterations: many(iterations),
  logs: many(generationLogs),
}));

export const iterationsRelations = relations(iterations, ({ one, many }) => ({
  script: one(scripts, {
    fields: [iterations.scriptId],
    references: [scripts.id],
  }),
  scriptVersion: one(scriptVersions, {
    fields: [iterations.id],
    references: [scriptVersions.iterationId],
  }),
  review: one(reviews, {
    fields: [iterations.id],
    references: [reviews.iterationId],
  }),
  logs: many(generationLogs),
}));

export const scriptVersionsRelations = relations(scriptVersions, ({ one }) => ({
  iteration: one(iterations, {
    fields: [scriptVersions.iterationId],
    references: [iterations.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  iteration: one(iterations, {
    fields: [reviews.iterationId],
    references: [iterations.id],
  }),
}));

export const generationLogsRelations = relations(generationLogs, ({ one }) => ({
  script: one(scripts, {
    fields: [generationLogs.scriptId],
    references: [scripts.id],
  }),
  iteration: one(iterations, {
    fields: [generationLogs.iterationId],
    references: [iterations.id],
  }),
}));

// TypeScript типы для экспорта

export type RssSource = InferSelectModel<typeof rssSources>;
export type NewRssSource = InferInsertModel<typeof rssSources>;

export type NewsItem = InferSelectModel<typeof newsItems>;
export type NewNewsItem = InferInsertModel<typeof newsItems>;

export type Script = InferSelectModel<typeof scripts>;
export type NewScript = InferInsertModel<typeof scripts>;

export type Iteration = InferSelectModel<typeof iterations>;
export type NewIteration = InferInsertModel<typeof iterations>;

export type ScriptVersion = InferSelectModel<typeof scriptVersions>;
export type NewScriptVersion = InferInsertModel<typeof scriptVersions>;

export type Review = InferSelectModel<typeof reviews>;
export type NewReview = InferInsertModel<typeof reviews>;

export type AISettings = InferSelectModel<typeof aiSettings>;
export type NewAISettings = InferInsertModel<typeof aiSettings>;

export type GenerationLog = InferSelectModel<typeof generationLogs>;
export type NewGenerationLog = InferInsertModel<typeof generationLogs>;
