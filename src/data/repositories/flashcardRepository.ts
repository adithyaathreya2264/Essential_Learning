import { getDb } from '../db/client';
import { ReviewStateFields } from '../../fsrs/scheduler';

export type FlashcardDeck = {
  id: string;
  chapterId: string;
  createdAt: number;
  updatedAt: number;
};

export type Flashcard = {
  id: string;
  deckId: string;
  front: string;
  back: string;
  createdAt: number;
};

export type NewCard = { front: string; back: string };

export async function getDeckForChapter(chapterId: string): Promise<FlashcardDeck | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<FlashcardDeck>('SELECT * FROM FlashcardDeck WHERE chapterId = ?', [chapterId]);
  return row ?? null;
}

export async function createDeck(chapterId: string): Promise<FlashcardDeck> {
  const db = await getDb();
  const now = Date.now();
  const id = `deck_${now}_${Math.random().toString(36).slice(2, 8)}`;
  await db.runAsync(
    'INSERT INTO FlashcardDeck (id, chapterId, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
    [id, chapterId, now, now]
  );
  return { id, chapterId, createdAt: now, updatedAt: now };
}

/** Inserts new cards (with fresh FSRS state) without touching any existing card in the deck. */
export async function addCards(
  deckId: string,
  cards: NewCard[],
  initialReviewState: () => ReviewStateFields
): Promise<Flashcard[]> {
  const db = await getDb();
  const now = Date.now();
  const saved: Flashcard[] = [];

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const id = `card_${now}_${i}_${Math.random().toString(36).slice(2, 8)}`;
    await db.runAsync('INSERT INTO Flashcard (id, deckId, front, back, createdAt) VALUES (?, ?, ?, ?, ?)', [
      id,
      deckId,
      c.front,
      c.back,
      now,
    ]);
    const state = initialReviewState();
    await db.runAsync(
      'INSERT INTO CardReviewState (cardId, due, stability, difficulty, elapsedDays, scheduledDays, learningSteps, reps, lapses, state, lastReview) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        state.due,
        state.stability,
        state.difficulty,
        state.elapsedDays,
        state.scheduledDays,
        state.learningSteps,
        state.reps,
        state.lapses,
        state.state,
        state.lastReview,
      ]
    );
    saved.push({ id, deckId, front: c.front, back: c.back, createdAt: now });
  }

  await db.runAsync('UPDATE FlashcardDeck SET updatedAt = ? WHERE id = ?', [now, deckId]);
  return saved;
}

/** Destructive: deletes every existing card (and its FSRS state) in the deck, then inserts the fresh set. */
export async function regenerateDeck(
  deckId: string,
  cards: NewCard[],
  initialReviewState: () => ReviewStateFields
): Promise<Flashcard[]> {
  const db = await getDb();
  await db.runAsync('DELETE FROM Flashcard WHERE deckId = ?', [deckId]);
  return addCards(deckId, cards, initialReviewState);
}

export async function updateCard(cardId: string, front: string, back: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE Flashcard SET front = ?, back = ? WHERE id = ?', [front, back, cardId]);
}

export async function deleteCard(cardId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM Flashcard WHERE id = ?', [cardId]);
}

export async function deleteDeck(deckId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM FlashcardDeck WHERE id = ?', [deckId]);
}

export async function listCardsForDeck(deckId: string): Promise<Flashcard[]> {
  const db = await getDb();
  return db.getAllAsync<Flashcard>('SELECT * FROM Flashcard WHERE deckId = ? ORDER BY createdAt ASC', [deckId]);
}

export async function countCardsForDeck(deckId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM Flashcard WHERE deckId = ?', [deckId]);
  return row?.count ?? 0;
}
