/**
 * Fix api_keys table - create if missing
 */

import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
const { Pool } = pg;

async function fixApiKeysTable() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Проверяю таблицу api_keys...');
    
    // Проверяем, существует ли таблица
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'api_keys'
      )
    `);
    
    if (tableExists.rows[0].exists) {
      console.log('✅ Таблица api_keys уже существует');
      
      // Проверяем структуру
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'api_keys'
        ORDER BY ordinal_position
      `);
      
      console.log('\nТекущие колонки:');
      columns.rows.forEach((row: any) => {
        console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    } else {
      console.log('Создаю таблицу api_keys...');
      
      // Создаем таблицу
      await pool.query(`
        CREATE TABLE "api_keys" (
          "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "user_id" varchar NOT NULL,
          "provider" varchar(50) NOT NULL,
          "encrypted_key" text NOT NULL,
          "last4" varchar(4),
          "description" text,
          "is_active" boolean DEFAULT true NOT NULL,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        )
      `);
      
      console.log('✅ Таблица api_keys создана');
      
      // Создаем внешний ключ
      console.log('Создаю внешний ключ...');
      await pool.query(`
        ALTER TABLE "api_keys" 
        ADD CONSTRAINT "api_keys_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") 
        REFERENCES "public"."users"("id") 
        ON DELETE cascade 
        ON UPDATE no action
      `);
      console.log('✅ Внешний ключ создан');
      
      // Создаем индекс
      console.log('Создаю индекс...');
      await pool.query(`
        CREATE INDEX "api_keys_user_id_idx" 
        ON "api_keys" USING btree ("user_id")
      `);
      console.log('✅ Индекс создан');
    }
    
    await pool.end();
    console.log('\n✅ Проверка завершена');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    await pool.end();
    process.exit(1);
  }
}

fixApiKeysTable();

