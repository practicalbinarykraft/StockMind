/**
 * Fix rss_sources table - align structure with schema
 */

import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
const { Pool } = pg;

async function fixRssSourcesTable() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Проверяю таблицу rss_sources...');
    
    // Проверяем текущие колонки
    const currentColumns = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'rss_sources'
      ORDER BY ordinal_position
    `);
    
    const columnNames = currentColumns.rows.map((r: any) => r.column_name);
    console.log('Текущие колонки:', columnNames.join(', '));
    
    // Проверяем, какие колонки нужно добавить/переименовать
    let needsName = !columnNames.includes('name');
    let needsUrl = !columnNames.includes('url');
    let needsLastParsed = !columnNames.includes('last_parsed');
    let needsParseStatus = !columnNames.includes('parse_status');
    const needsParseError = !columnNames.includes('parse_error');
    const needsUpdatedAt = !columnNames.includes('updated_at');
    
    const hasFeedUrl = columnNames.includes('feed_url');
    const hasDisplayTitle = columnNames.includes('display_title');
    const hasLastFetchedAt = columnNames.includes('last_fetched_at');
    const hasLastFetchStatus = columnNames.includes('last_fetch_status');
    
    // Переименовываем старые колонки, если они есть
    if (hasDisplayTitle && needsName) {
      console.log('Переименовываю display_title -> name...');
      await pool.query('ALTER TABLE rss_sources RENAME COLUMN display_title TO name');
      console.log('✅ Колонка переименована');
      needsName = false; // Обновляем флаг
    }
    
    if (hasFeedUrl && needsUrl) {
      console.log('Переименовываю feed_url -> url...');
      await pool.query('ALTER TABLE rss_sources RENAME COLUMN feed_url TO url');
      console.log('✅ Колонка переименована');
      needsUrl = false; // Обновляем флаг
    }
    
    if (hasLastFetchedAt && needsLastParsed) {
      console.log('Переименовываю last_fetched_at -> last_parsed...');
      await pool.query('ALTER TABLE rss_sources RENAME COLUMN last_fetched_at TO last_parsed');
      console.log('✅ Колонка переименована');
      needsLastParsed = false; // Обновляем флаг
    }
    
    if (hasLastFetchStatus && needsParseStatus) {
      console.log('Переименовываю last_fetch_status -> parse_status...');
      await pool.query('ALTER TABLE rss_sources RENAME COLUMN last_fetch_status TO parse_status');
      console.log('✅ Колонка переименована');
      needsParseStatus = false; // Обновляем флаг
    }
    
    // Добавляем недостающие колонки (проверяем еще раз после переименований)
    const columnsAfterRename = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'rss_sources'
    `);
    const columnNamesAfter = columnsAfterRename.rows.map((r: any) => r.column_name);
    
    if (!columnNamesAfter.includes('name')) {
      console.log('Добавляю колонку name...');
      await pool.query('ALTER TABLE rss_sources ADD COLUMN name varchar(255)');
      // Заполняем из url, если возможно
      await pool.query(`
        UPDATE rss_sources 
        SET name = COALESCE(SUBSTRING(url FROM 'https?://([^/]+)'), 'RSS Source')
        WHERE name IS NULL OR name = ''
      `);
      await pool.query('ALTER TABLE rss_sources ALTER COLUMN name SET NOT NULL');
      console.log('✅ Колонка name добавлена');
    }
    
    if (!columnNamesAfter.includes('url')) {
      console.log('Добавляю колонку url...');
      await pool.query('ALTER TABLE rss_sources ADD COLUMN url text');
      // Копируем из feed_url, если он еще существует
      if (columnNamesAfter.includes('feed_url')) {
        await pool.query('UPDATE rss_sources SET url = feed_url WHERE url IS NULL');
      }
      await pool.query('ALTER TABLE rss_sources ALTER COLUMN url SET NOT NULL');
      console.log('✅ Колонка url добавлена');
    }
    
    if (!columnNamesAfter.includes('last_parsed')) {
      console.log('Добавляю колонку last_parsed...');
      await pool.query('ALTER TABLE rss_sources ADD COLUMN last_parsed timestamp');
      console.log('✅ Колонка last_parsed добавлена');
    }
    
    if (!columnNamesAfter.includes('parse_status')) {
      console.log('Добавляю колонку parse_status...');
      await pool.query('ALTER TABLE rss_sources ADD COLUMN parse_status varchar(20) DEFAULT \'pending\'');
      console.log('✅ Колонка parse_status добавлена');
    }
    
    if (!columnNamesAfter.includes('parse_error')) {
      console.log('Добавляю колонку parse_error...');
      await pool.query('ALTER TABLE rss_sources ADD COLUMN parse_error text');
      console.log('✅ Колонка parse_error добавлена');
    }
    
    if (!columnNamesAfter.includes('updated_at')) {
      console.log('Добавляю колонку updated_at...');
      await pool.query('ALTER TABLE rss_sources ADD COLUMN updated_at timestamp DEFAULT now() NOT NULL');
      console.log('✅ Колонка updated_at добавлена');
    }
    
    // Удаляем старые колонки, если они остались
    if (columnNamesAfter.includes('feed_url') && columnNamesAfter.includes('url')) {
      console.log('Удаляю старую колонку feed_url...');
      await pool.query('ALTER TABLE rss_sources DROP COLUMN IF EXISTS feed_url');
      console.log('✅ Старая колонка удалена');
    }
    
    if (columnNamesAfter.includes('display_title') && columnNamesAfter.includes('name')) {
      console.log('Удаляю старую колонку display_title...');
      await pool.query('ALTER TABLE rss_sources DROP COLUMN IF EXISTS display_title');
      console.log('✅ Старая колонка удалена');
    }
    
    if (columnNamesAfter.includes('last_fetched_at') && columnNamesAfter.includes('last_parsed')) {
      console.log('Удаляю старую колонку last_fetched_at...');
      await pool.query('ALTER TABLE rss_sources DROP COLUMN IF EXISTS last_fetched_at');
      console.log('✅ Старая колонка удалена');
    }
    
    if (columnNamesAfter.includes('last_fetch_status') && columnNamesAfter.includes('parse_status')) {
      console.log('Удаляю старую колонку last_fetch_status...');
      await pool.query('ALTER TABLE rss_sources DROP COLUMN IF EXISTS last_fetch_status');
      console.log('✅ Старая колонка удалена');
    }
    
    // Проверяем финальную структуру
    const finalColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'rss_sources'
      ORDER BY ordinal_position
    `);
    
    console.log('\n✅ Финальная структура таблицы rss_sources:');
    finalColumns.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
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

fixRssSourcesTable();

