import { getDb } from '../db/client';

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  chapterId: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

export async function listMessagesForChapter(chapterId: string): Promise<ChatMessage[]> {
  const db = await getDb();
  return db.getAllAsync<ChatMessage>(
    'SELECT * FROM ChatMessage WHERE chapterId = ? ORDER BY createdAt ASC, id ASC',
    [chapterId]
  );
}

export async function addMessage(
  chapterId: string,
  role: ChatRole,
  content: string
): Promise<ChatMessage> {
  const db = await getDb();
  const message: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    chapterId,
    role,
    content,
    createdAt: Date.now(),
  };
  await db.runAsync(
    'INSERT INTO ChatMessage (id, chapterId, role, content, createdAt) VALUES (?, ?, ?, ?, ?)',
    [message.id, message.chapterId, message.role, message.content, message.createdAt]
  );
  return message;
}

export async function clearMessagesForChapter(chapterId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM ChatMessage WHERE chapterId = ?', [chapterId]);
}
