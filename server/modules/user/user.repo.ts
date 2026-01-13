import { db } from "../../db";
import { users, type User, type UpsertUser } from "@shared/schema";
import { eq } from "drizzle-orm";
import { CreateUserInDBDto } from "./user.dto";

export class UserRepo {
    async getById(id: string): Promise<User | undefined> {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user;
    }
    
    async create(data: CreateUserInDBDto): Promise<User | undefined> {
        const [newUser] = await db.insert(users).values(data).returning();
        return newUser;
    }

    async findByEmail(email: string): Promise<User | undefined> {
        const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        return existingUser;
    }
}