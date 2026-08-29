import { Card, createEmptyCard, fsrs, Grade, Rating, State } from 'ts-fsrs';

/**
 * Field names here match `ts-fsrs`'s real `Card` interface (confirmed against
 * the installed package's `.d.ts`, not assumed) but in camelCase and with
 * `Date`s as epoch-ms numbers, matching how they're stored in SQLite.
 */
export type ReviewStateFields = {
  due: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: State;
  lastReview: number | null;
};

export type UIRating = 'Again' | 'Hard' | 'Good' | 'Easy';

const RATING_MAP: Record<UIRating, Grade> = {
  Again: Rating.Again,
  Hard: Rating.Hard,
  Good: Rating.Good,
  Easy: Rating.Easy,
};

const scheduler = fsrs();

function toCard(state: ReviewStateFields): Card {
  return {
    due: new Date(state.due),
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsedDays,
    scheduled_days: state.scheduledDays,
    learning_steps: state.learningSteps,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state,
    last_review: state.lastReview === null ? undefined : new Date(state.lastReview),
  };
}

function fromCard(card: Card): ReviewStateFields {
  return {
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review ? card.last_review.getTime() : null,
  };
}

/** A freshly-generated card's initial FSRS state, due immediately. */
export function createInitialReviewState(now: Date = new Date()): ReviewStateFields {
  return fromCard(createEmptyCard(now));
}

/** Applies a student's rating to a card's current state, returning its next state (including next due date). */
export function scheduleReview(state: ReviewStateFields, rating: UIRating, now: Date = new Date()): ReviewStateFields {
  const card = toCard(state);
  const grade = RATING_MAP[rating];
  const { card: nextCard } = scheduler.next(card, now, grade);
  return fromCard(nextCard);
}
