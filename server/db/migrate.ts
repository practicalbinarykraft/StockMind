import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;

async function runSingleMigration() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const migrationFile = './drizzle/migrations/0009_add_scene_comments.sql';
  const sql = fs.readFileSync(migrationFile, 'utf-8');

  // Выполнить SQL напрямую
  await db.execute(sql);

  console.log(`✅ Migration ${migrationFile} applied`);

  await pool.end();
}

runSingleMigration().catch(console.error);
