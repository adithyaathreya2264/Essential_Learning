import { getDb } from '../db/client';
import { ReviewStateFields, UIRating } from '../../fsrs/scheduler';
import { Flashcard } from './flashcardRepository';

export type DueCard = {
  card: Flashcard;
  state: ReviewStateFields;
  chapterId: string;
  chapterTitle: string;
};

/** Raw joined row shape from SQLite — flat columns, mapped into DueCard below. */
type DueCardRow = {
  cardId: string;
  deckId: string;
  front: string;
  back: string;
  cardCreatedAt: number;
  due: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: number | null;
  chapterId: string;
  chapterTitle: string;
};

function toDueCard(row: DueCardRow): DueCard {
  return {
    card: { id: row.cardId, deckId: row.deckId, front: row.front, back: row.back, createdAt: row.cardCreatedAt },
    state: {
      due: row.due,
      stability: row.stability,
      difficulty: row.difficulty,
      elapsedDays: row.elapsedDays,
      scheduledDays: row.scheduledDays,
      learningSteps: row.learningSteps,
      reps: row.reps,
      lapses: row.lapses,
      state: row.state,
      lastReview: row.lastReview,
    },
    chapterId: row.chapterId,
    chapterTitle: row.chapterTitle,
  };
}

const DUE_CARD_SELECT = `
SELECT
  f.id as cardId, f.deckId, f.front, f.back, f.createdAt as cardCreatedAt,
  r.due, r.stability, r.difficulty, r.elapsedDays, r.scheduledDays, r.learningSteps, r.reps, r.lapses, r.state, r.lastReview,
  d.chapterId, c.title as chapterTitle
FROM Flashcard f
JOIN CardReviewState r ON r.cardId = f.id
JOIN FlashcardDeck d ON d.id = f.deckId
JOIN Chapter c ON c.id = d.chapterId
WHERE r.due <= ?
`;

/** Due cards, most-overdue first. Omit `chapterId` for the cross-chapter aggregate (Due Today). */
export async function listDueCards(chapterId?: string, now: number = Date.now()): Promise<DueCard[]> {
  const db = await getDb();
  const rows = chapterId
    ? await db.getAllAsync<DueCardRow>(`${DUE_CARD_SELECT} AND d.chapterId = ? ORDER BY r.due ASC`, [now, chapterId])
    : await db.getAllAsync<DueCardRow>(`${DUE_CARD_SELECT} ORDER BY r.due ASC`, [now]);
  return rows.map(toDueCard);
}

export async function countDueCards(chapterId?: string, now: number = Date.now()): Promise<number> {
  const db = await getDb();
  const row = chapterId
    ? await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM CardReviewState r JOIN Flashcard f ON f.id = r.cardId JOIN FlashcardDeck d ON d.id = f.deckId WHERE r.due <= ? AND d.chapterId = ?',
        [now, chapterId]
      )
    : await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM CardReviewState WHERE due <= ?', [now]);
  return row?.count ?? 0;
}

export async function getReviewState(cardId: string): Promise<ReviewStateFields | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Omit<ReviewStateFields, 'lastReview'> & { lastReview: number | null }>(
    'SELECT due, stability, difficulty, elapsedDays, scheduledDays, learningSteps, reps, lapses, state, lastReview FROM CardReviewState WHERE cardId = ?',
    [cardId]
  );
  return row ?? null;
}

/** Incremental per-card save — called immediately after each rating, not batched at session end. */
export async function recordReview(cardId: string, updatedState: ReviewStateFields): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE CardReviewState SET due = ?, stability = ?, difficulty = ?, elapsedDays = ?, scheduledDays = ?, learningSteps = ?, reps = ?, lapses = ?, state = ?, lastReview = ? WHERE cardId = ?',
    [
      updatedState.due,
      updatedState.stability,
      updatedState.difficulty,
      updatedState.elapsedDays,
      updatedState.scheduledDays,
      updatedState.learningSteps,
      updatedState.reps,
      updatedState.lapses,
      updatedState.state,
      updatedState.lastReview,
      cardId,
    ]
  );
}

/** Appends one review event — separate from recordReview's state upsert, so weekly/streak stats can count every review, not just each card's latest. */
export async function logReview(
  cardId: string,
  chapterId: string,
  rating: UIRating,
  reviewedAt: number = Date.now()
): Promise<void> {
  const db = await getDb();
  const id = `reviewlog_${reviewedAt}_${Math.random().toString(36).slice(2, 8)}`;
  await db.runAsync('INSERT INTO ReviewLog (id, cardId, chapterId, rating, reviewedAt) VALUES (?, ?, ?, ?, ?)', [
    id,
    cardId,
    chapterId,
    rating,
    reviewedAt,
  ]);
}
