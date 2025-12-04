/**
 * Fix users table - add password_hash column if missing
 * This is a one-time fix for databases created before password_hash was added
 */

import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
const { Pool } = pg;

async function fixUsersTable() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Проверяю структуру таблицы users...');
    
    // Проверяем, существует ли колонка
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password_hash'
    `);
    
    if (checkResult.rows.length === 0) {
      console.log('Добавляю колонку password_hash...');
      await pool.query('ALTER TABLE users ADD COLUMN password_hash text');
      console.log('✅ Колонка password_hash добавлена');
    } else {
      console.log('✅ Колонка password_hash уже существует');
    }
    
    // Проверяем другие необходимые колонки
    const allColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('\nТекущие колонки в таблице users:');
    allColumns.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}`);
    });
    
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

fixUsersTable();

