import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

// Для работы с мок данными БД не обязательна
// Если DATABASE_URL не указан - сервер будет работать с мок данными
const DATABASE_URL = process.env.DATABASE_URL;

let client: ReturnType<typeof postgres> | null = null;
let db: ReturnType<typeof drizzle> | null = null;

if (DATABASE_URL) {
  try {
    client = postgres(DATABASE_URL);
    db = drizzle(client, { schema });
    console.log('[DB] Подключение к БД установлено');
  } catch (error) {
    console.warn('[DB] Предупреждение: Не удалось подключиться к БД:', error);
    console.warn('[DB] Сервер будет работать с мок данными');
  }
} else {
  console.warn('[DB] DATABASE_URL не указан. Сервер будет работать с мок данными.');
}

// Экспортируем db и client (могут быть null)
export { db, client };

// Вспомогательная функция для проверки доступности БД
export function isDbAvailable(): boolean {
  return db !== null && client !== null;
}
