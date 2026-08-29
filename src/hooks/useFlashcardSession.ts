import { useCallback, useState } from 'react';
import { scheduleReview, UIRating } from '../fsrs/scheduler';
import { DueCard, logReview, recordReview } from '../data/repositories/reviewStateRepository';

export type SessionSummary = {
  reviewed: number;
  counts: Record<UIRating, number>;
};

const EMPTY_COUNTS: Record<UIRating, number> = { Again: 0, Hard: 0, Good: 0, Easy: 0 };

/**
 * Drives a due-card review session: flip/reveal, rate, FSRS-update, persist
 * (incrementally, per card — never batched), advance. Shared by the
 * per-chapter review screen and the cross-chapter Due Today aggregate, which
 * differ only in how they build the initial `queue`.
 */
export function useFlashcardSession(queue: DueCard[]) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [counts, setCounts] = useState<Record<UIRating, number>>(EMPTY_COUNTS);

  // Derived every render from the live `queue`/`index`, not a useState snapshot —
  // `queue` starts empty while the caller is still loading real due cards and is
  // replaced wholesale once they arrive, so a one-time-initialized boolean would
  // freeze "done" from that first empty render and never reflect the real data.
  const done = queue.length === 0 || index >= queue.length;
  const current = done ? null : (queue[index] ?? null);

  const reveal = useCallback(() => setRevealed(true), []);

  const rate = useCallback(
    async (rating: UIRating) => {
      if (!current) return;
      const nextState = scheduleReview(current.state, rating, new Date());
      await Promise.all([recordReview(current.card.id, nextState), logReview(current.card.id, current.chapterId, rating)]);
      setCounts((prev) => ({ ...prev, [rating]: prev[rating] + 1 }));
      setRevealed(false);
      setIndex((i) => i + 1);
    },
    [current]
  );

  const reviewed = Object.values(counts).reduce((a, b) => a + b, 0);

  return {
    current,
    revealed,
    reveal,
    rate,
    progress: { index, total: queue.length },
    done,
    summary: { reviewed, counts } as SessionSummary,
  };
}
