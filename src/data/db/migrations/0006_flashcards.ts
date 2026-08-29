import { type SQLiteDatabase } from 'expo-sqlite';
import { CREATE_FLASHCARD_TABLES_SQL } from '../schema';

export async function migrate0006Flashcards(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(CREATE_FLASHCARD_TABLES_SQL);
}
