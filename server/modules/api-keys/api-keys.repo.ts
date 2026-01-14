import { db } from "../../db";
import { apiKeys } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";


export class ApiKeysRepo {
    async create(data: any, userId: string, encryptedKey: string, last4: any) {
        const [key] = await db
            .insert(apiKeys)
            .values({
                ...data,
                userId,
                encryptedKey,
                last4,
            }).returning();

        return key;
    }

    async getById(id: string, userId: string) {
        const [key] = await db
          .select()
          .from(apiKeys)
          .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
          .limit(1);
        
        return key;
    }

    async getUserApiKey(userId: string, provider: string) {
        const [key] = await db
          .select()
          .from(apiKeys)
          .where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, provider), eq(apiKeys.isActive, true)))
          .orderBy(desc(apiKeys.updatedAt))
          .limit(1);

        return key;
      }

    async getAllByUserId(userId: string) {
        const keys = await db
            .select()
            .from(apiKeys)
            .where(eq(apiKeys.userId, userId))
            .orderBy(desc(apiKeys.createdAt));

        return keys;
    }

    async delete(id: string, userId: string) {
        const [key] = await db
            .delete(apiKeys)
            .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
            .returning();
        
        return key;
    }
}