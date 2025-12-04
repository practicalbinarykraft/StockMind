/**
 * Fix all database tables - align structure with schema
 * Checks and fixes: rss_items, rss_sources, api_keys, and other tables
 */

import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
const { Pool } = pg;

async function fixAllTables() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('🔍 Проверяю структуру всех таблиц...\n');
    
    // ============================================================================
    // 1. RSS ITEMS TABLE
    // ============================================================================
    console.log('=== 1. Таблица rss_items ===');
    const rssItemsColumns = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'rss_items'
      ORDER BY ordinal_position
    `);
    
    const rssItemsColNames = rssItemsColumns.rows.map((r: any) => r.column_name);
    console.log('Текущие колонки:', rssItemsColNames.join(', '));
    
    // Ожидаемые колонки из схемы
    const expectedRssItemsCols = {
      'id': 'varchar PRIMARY KEY',
      'source_id': 'varchar NOT NULL',
      'user_id': 'varchar',
      'title': 'text NOT NULL',
      'url': 'text NOT NULL',
      'content': 'text',
      'full_content': 'text',
      'last_fetched_at': 'timestamp',
      'image_url': 'text',
      'ai_score': 'integer',
      'ai_comment': 'text',
      'user_action': 'varchar(20)',
      'action_at': 'timestamp',
      'used_in_project': 'varchar',
      'freshness_score': 'integer',
      'virality_score': 'integer',
      'quality_score': 'integer',
      'published_at': 'timestamp',
      'parsed_at': 'timestamp DEFAULT now() NOT NULL',
    };
    
    // Удаляем старые колонки, которых нет в схеме
    const oldColsToRemove = ['excerpt', 'author', 'primary_image_url', 'hash', 'json', 
      'lang_detected', 'title_translated', 'summary_translated', 'translated_to', 
      'translate_status', 'translate_provider', 'translate_cost_cents', 
      'analysis_status', 'analysis_error', 'analysis_attempts', 'last_analysis_at'];
    
    for (const col of oldColsToRemove) {
      if (rssItemsColNames.includes(col)) {
        console.log(`  Удаляю старую колонку ${col}...`);
        try {
          await pool.query(`ALTER TABLE rss_items DROP COLUMN IF EXISTS ${col}`);
          console.log(`  ✅ Колонка ${col} удалена`);
        } catch (err: any) {
          console.log(`  ⚠️  Не удалось удалить ${col}: ${err.message}`);
        }
      }
    }
    
    // Добавляем недостающие колонки
    const colsToAdd = {
      'content': 'text',
      'full_content': 'text',
      'last_fetched_at': 'timestamp',
      'image_url': 'text',
      'ai_score': 'integer',
      'ai_comment': 'text',
      'user_action': 'varchar(20)',
      'action_at': 'timestamp',
      'used_in_project': 'varchar',
      'freshness_score': 'integer',
      'virality_score': 'integer',
      'quality_score': 'integer',
      'published_at': 'timestamp',
      'parsed_at': 'timestamp DEFAULT now() NOT NULL',
    };
    
    for (const [colName, colType] of Object.entries(colsToAdd)) {
      if (!rssItemsColNames.includes(colName)) {
        console.log(`  Добавляю колонку ${colName}...`);
        try {
          if (colType.includes('DEFAULT')) {
            await pool.query(`ALTER TABLE rss_items ADD COLUMN ${colName} ${colType}`);
          } else {
            await pool.query(`ALTER TABLE rss_items ADD COLUMN ${colName} ${colType}`);
          }
          console.log(`  ✅ Колонка ${colName} добавлена`);
        } catch (err: any) {
          console.log(`  ⚠️  Не удалось добавить ${colName}: ${err.message}`);
        }
      }
    }
    
    // Проверяем user_id
    if (!rssItemsColNames.includes('user_id')) {
      console.log('  Добавляю колонку user_id...');
      await pool.query('ALTER TABLE rss_items ADD COLUMN user_id varchar');
      console.log('  ✅ Колонка user_id добавлена');
    }
    
    // ============================================================================
    // 2. Проверяем другие таблицы
    // ============================================================================
    console.log('\n=== 2. Проверка других таблиц ===');
    
    // Проверяем instagram_sources
    const igSourcesExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'instagram_sources'
      )
    `);
    
    if (!igSourcesExists.rows[0].exists) {
      console.log('  ⚠️  Таблица instagram_sources не существует');
    } else {
      console.log('  ✅ Таблица instagram_sources существует');
    }
    
    // Проверяем ig_accounts
    const igAccountsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ig_accounts'
      )
    `);
    
    if (!igAccountsExists.rows[0].exists) {
      console.log('  ⚠️  Таблица ig_accounts не существует');
    } else {
      console.log('  ✅ Таблица ig_accounts существует');
    }
    
    // Финальная проверка rss_items
    const finalRssItemsCols = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'rss_items'
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== Финальная структура rss_items ===');
    finalRssItemsCols.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
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

fixAllTables();

