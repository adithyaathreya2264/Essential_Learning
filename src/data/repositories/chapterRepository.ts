import { getDb } from '../db/client';

export type Chapter = {
  id: string;
  subjectId: string;
  title: string;
  content: string;
  orderIndex: number;
  createdAt: number;
};

export type NewChapter = {
  title: string;
  content: string;
  orderIndex: number;
};

export async function saveChapters(subjectId: string, chapters: NewChapter[]): Promise<Chapter[]> {
  const db = await getDb();
  const now = Date.now();
  const saved: Chapter[] = [];

  for (const chapter of chapters) {
    const id = `chapter_${now}_${Math.random().toString(36).slice(2, 8)}`;
    await db.runAsync(
      'INSERT INTO Chapter (id, subjectId, title, content, orderIndex, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [id, subjectId, chapter.title, chapter.content, chapter.orderIndex, now]
    );
    saved.push({ id, subjectId, title: chapter.title, content: chapter.content, orderIndex: chapter.orderIndex, createdAt: now });
  }

  return saved;
}

export async function listChaptersForSubject(subjectId: string): Promise<Chapter[]> {
  const db = await getDb();
  return db.getAllAsync<Chapter>('SELECT * FROM Chapter WHERE subjectId = ? ORDER BY orderIndex ASC', [subjectId]);
}

export async function countChaptersForSubject(subjectId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM Chapter WHERE subjectId = ?',
    [subjectId]
  );
  return row?.count ?? 0;
}

export async function getChapterById(id: string): Promise<Chapter | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Chapter>('SELECT * FROM Chapter WHERE id = ?', [id]);
  return row ?? null;
}
