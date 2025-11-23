import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// SESSION & USER TABLES
// ============================================================================

// Session storage table - for Express sessions
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table with JWT authentication support
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(), // Email is required for login
  passwordHash: text("password_hash"), // Password hash for JWT auth
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// User registration schema
export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// User login schema
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ============================================================================
// API KEYS TABLE
// ============================================================================

export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar("provider", { length: 50 }).notNull(), // 'openai', 'anthropic', 'elevenlabs', 'heygen', 'kieai', 'apify'
  encryptedKey: text("encrypted_key").notNull(),
  last4: varchar("last4", { length: 4 }), // Last 4 characters for display (e.g., "x7Qz")
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("api_keys_user_id_idx").on(table.userId),
]);

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  userId: true,
  encryptedKey: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // We'll receive the plain key from frontend, encrypt on backend
  key: z.string().min(1, "API key is required"),
});

export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
