// User storage operations
import { db } from "../db";
import { users, type User, type UpsertUser } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * User storage interface
 */
export interface IUserStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

/**
 * User storage implementation
 * Handles user operations required for Replit Auth
 */
export class UserStorage implements IUserStorage {
  /**
   * Get a user by ID
   */
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  /**
   * Create or update a user
   * Used for Replit Auth user synchronization
   */
  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
}

export const userStorage = new UserStorage();
