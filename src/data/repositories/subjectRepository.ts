import { getDb } from '../db/client';

export type Subject = {
  id: string;
  name: string;
  createdAt: number;
};

export async function createSubject(name: string): Promise<Subject> {
  const db = await getDb();
  const subject: Subject = {
    id: `subject_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    createdAt: Date.now(),
  };
  await db.runAsync('INSERT INTO Subject (id, name, createdAt) VALUES (?, ?, ?)', [
    subject.id,
    subject.name,
    subject.createdAt,
  ]);
  return subject;
}

export async function getSubjectByName(name: string): Promise<Subject | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Subject>('SELECT * FROM Subject WHERE name = ?', [name]);
  return row ?? null;
}

export async function getOrCreateSubject(name: string): Promise<Subject> {
  const existing = await getSubjectByName(name);
  if (existing) return existing;
  return createSubject(name);
}

export async function listSubjects(): Promise<Subject[]> {
  const db = await getDb();
  return db.getAllAsync<Subject>('SELECT * FROM Subject ORDER BY createdAt DESC');
}

export async function getSubjectById(id: string): Promise<Subject | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Subject>('SELECT * FROM Subject WHERE id = ?', [id]);
  return row ?? null;
}
