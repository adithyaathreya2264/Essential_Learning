import { getDb } from '../db/client';

/** Local-calendar-day key (not UTC) — a streak/week grid should follow the student's own day boundaries. */
function localDayKey(epochMs: number): string {
  const d = new Date(epochMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfLocalDay(epochMs: number): Date {
  const d = new Date(epochMs);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Monday-start offset: 0 for Monday ... 6 for Sunday (JS getDay() is Sunday-start). */
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export type RecentChapterActivity = {
  chapterId: string;
  chapterTitle: string;
  subjectName: string;
  lastActivityAt: number;
};

/** Most recently touched chapter across chat, quiz, and flashcard review — the "Continue studying" card. */
export async function getMostRecentChapterActivity(): Promise<RecentChapterActivity | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ chapterId: string; lastActivityAt: number }>(
    `SELECT chapterId, MAX(activityAt) as lastActivityAt FROM (
       SELECT chapterId, createdAt as activityAt FROM ChatMessage
       UNION ALL
       SELECT chapterId, createdAt as activityAt FROM Quiz
       UNION ALL
       SELECT chapterId, reviewedAt as activityAt FROM ReviewLog
     )
     GROUP BY chapterId
     ORDER BY lastActivityAt DESC
     LIMIT 1`
  );
  if (!row) return null;

  const chapter = await db.getFirstAsync<{ title: string; subjectName: string }>(
    `SELECT c.title as title, s.name as subjectName FROM Chapter c JOIN Subject s ON s.id = c.subjectId WHERE c.id = ?`,
    [row.chapterId]
  );
  if (!chapter) return null;

  return { chapterId: row.chapterId, chapterTitle: chapter.title, subjectName: chapter.subjectName, lastActivityAt: row.lastActivityAt };
}

/** Chapters with at least one chat message, quiz, or flashcard deck — the "started" count behind subject progress bars. */
export async function countStartedChapters(subjectId?: string): Promise<number> {
  const db = await getDb();
  const startedCondition = `(
    EXISTS (SELECT 1 FROM ChatMessage m WHERE m.chapterId = c.id) OR
    EXISTS (SELECT 1 FROM Quiz q WHERE q.chapterId = c.id) OR
    EXISTS (SELECT 1 FROM FlashcardDeck d WHERE d.chapterId = c.id)
  )`;
  const row = subjectId
    ? await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM Chapter c WHERE c.subjectId = ? AND ${startedCondition}`,
        [subjectId]
      )
    : await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM Chapter c WHERE ${startedCondition}`);
  return row?.count ?? 0;
}

export type WeeklyStudySummary = {
  /** Monday..Sunday, true where any activity happened that day. */
  weekDots: boolean[];
  /** Consecutive days with activity, ending today (or yesterday, if today has none yet). */
  streakDays: number;
  quizzesTaken: number;
  cardsReviewed: number;
};

const STREAK_LOOKBACK_DAYS = 60;

export async function getWeeklyStudySummary(now: number = Date.now()): Promise<WeeklyStudySummary> {
  const db = await getDb();
  const lookbackStart = now - STREAK_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

  const activityRows = await db.getAllAsync<{ activityAt: number }>(
    `SELECT createdAt as activityAt FROM ChatMessage WHERE createdAt >= ?
     UNION ALL
     SELECT completedAt as activityAt FROM Quiz WHERE completedAt IS NOT NULL AND completedAt >= ?
     UNION ALL
     SELECT reviewedAt as activityAt FROM ReviewLog WHERE reviewedAt >= ?`,
    [lookbackStart, lookbackStart, lookbackStart]
  );
  const activeDays = new Set(activityRows.map((r) => localDayKey(r.activityAt)));

  const today = startOfLocalDay(now);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - mondayIndex(today));
  const weekDots = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    return activeDays.has(localDayKey(day.getTime()));
  });

  let streakDays = 0;
  let cursor = new Date(today);
  if (!activeDays.has(localDayKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1); // today's not "broken" yet — start counting from yesterday
  }
  while (activeDays.has(localDayKey(cursor.getTime()))) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const weekStartMs = weekStart.getTime();
  const [quizRow, cardRow] = await Promise.all([
    db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM Quiz WHERE completedAt IS NOT NULL AND completedAt >= ?',
      [weekStartMs]
    ),
    db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM ReviewLog WHERE reviewedAt >= ?', [weekStartMs]),
  ]);

  return {
    weekDots,
    streakDays,
    quizzesTaken: quizRow?.count ?? 0,
    cardsReviewed: cardRow?.count ?? 0,
  };
}
