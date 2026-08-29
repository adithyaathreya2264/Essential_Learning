import * as SQLite from 'expo-sqlite';
import { migrate0001Init } from './migrations/0001_init';
import { migrate0002ModelInstall } from './migrations/0002_model_install';
import { migrate0003Settings } from './migrations/0003_settings';
import { migrate0004ChatMessages } from './migrations/0004_chat_messages';
import { migrate0005Quiz } from './migrations/0005_quiz';
import { migrate0006Flashcards } from './migrations/0006_flashcards';
import { migrate0007Reminders } from './migrations/0007_reminders';
import { migrate0008ReviewLog } from './migrations/0008_review_log';

const DB_NAME = 'essential_learning.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate();
  }
  return dbPromise;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await migrate0001Init(db);
  await migrate0002ModelInstall(db);
  await migrate0003Settings(db);
  await migrate0004ChatMessages(db);
  await migrate0005Quiz(db);
  await migrate0006Flashcards(db);
  await migrate0007Reminders(db);
  await migrate0008ReviewLog(db);
  return db;
}
