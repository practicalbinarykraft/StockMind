/**
 * Fix projects table - align structure with schema
 * Renames columns and adds missing ones
 */

import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
const { Pool } = pg;

async function fixProjectsTable() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('🔍 Проверяю структуру таблицы projects...\n');
    
    // Проверяем текущие колонки
    const currentColumns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'projects'
      ORDER BY ordinal_position
    `);
    
    const colNames = currentColumns.rows.map((r: any) => r.column_name);
    console.log('Текущие колонки:', colNames.join(', '));
    
    // Переименовываем name -> title
    if (colNames.includes('name') && !colNames.includes('title')) {
      console.log('Переименовываю name -> title...');
      await pool.query('ALTER TABLE projects RENAME COLUMN name TO title');
      console.log('✅ Колонка переименована');
    } else if (colNames.includes('name') && colNames.includes('title')) {
      console.log('⚠️  Обе колонки (name и title) существуют. Удаляю name...');
      // Переносим данные из name в title если title пустой
      await pool.query(`
        UPDATE projects 
        SET title = name 
        WHERE (title IS NULL OR title = '') AND name IS NOT NULL
      `);
      await pool.query('ALTER TABLE projects DROP COLUMN name');
      console.log('✅ Колонка name удалена');
    }
    
    // Переименовываем type -> source_type
    if (colNames.includes('type') && !colNames.includes('source_type')) {
      console.log('Переименовываю type -> source_type...');
      await pool.query('ALTER TABLE projects RENAME COLUMN type TO source_type');
      console.log('✅ Колонка переименована');
    } else if (colNames.includes('type') && colNames.includes('source_type')) {
      console.log('⚠️  Обе колонки (type и source_type) существуют. Удаляю type...');
      // Переносим данные из type в source_type если source_type пустой
      await pool.query(`
        UPDATE projects 
        SET source_type = type 
        WHERE (source_type IS NULL OR source_type = '') AND type IS NOT NULL
      `);
      await pool.query('ALTER TABLE projects DROP COLUMN type');
      console.log('✅ Колонка type удалена');
    }
    
    // Добавляем недостающие колонки
    const colsToAdd = {
      'source_data': 'jsonb',
      'current_stage': 'integer DEFAULT 1 NOT NULL',
    };
    
    for (const [colName, colType] of Object.entries(colsToAdd)) {
      if (!colNames.includes(colName) && !(await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'projects' AND column_name = $1
        )
      `, [colName])).rows[0].exists) {
        console.log(`Добавляю колонку ${colName}...`);
        await pool.query(`ALTER TABLE projects ADD COLUMN ${colName} ${colType}`);
        console.log(`✅ Колонка ${colName} добавлена`);
      }
    }
    
    // Удаляем старые колонки, которых нет в схеме
    const oldColsToRemove = ['script', 'description', 'reel_id'];
    for (const col of oldColsToRemove) {
      if (colNames.includes(col)) {
        console.log(`Удаляю старую колонку ${col}...`);
        try {
          await pool.query(`ALTER TABLE projects DROP COLUMN IF EXISTS ${col}`);
          console.log(`✅ Колонка ${col} удалена`);
        } catch (err: any) {
          console.log(`⚠️  Не удалось удалить ${col}: ${err.message}`);
        }
      }
    }
    
    // Финальная проверка
    const finalColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'projects'
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== Финальная структура projects ===');
    finalColumns.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable === 'YES' ? 'YES' : 'NO'})`);
    });
    
    await pool.end();
    console.log('\n✅ Таблица projects исправлена');
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

fixProjectsTable();

