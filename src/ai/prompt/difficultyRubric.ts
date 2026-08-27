import { DifficultyLevel } from '../../core/constants/difficulty';

/**
 * Single source of truth for what each difficulty level means.
 *
 * Deliberately shared: Phase 6 runs generation and an independent
 * classification pass against this same text, so a question generated as
 * "hard" is judged by the identical standard it was written to. If the two
 * ever drift apart, the honest "requested vs. generated" mismatch label the
 * app shows becomes meaningless.
 */
export const DIFFICULTY_RUBRIC: Record<Exclude<DifficultyLevel, 'mix'>, string> = {
  easy: 'Recall. Answerable by locating a single fact, definition, or term stated directly in the chapter.',
  medium:
    'Comprehension. Requires explaining a mechanism, relating two ideas from the chapter, or applying a stated concept to a straightforward case.',
  hard: 'Analysis. Requires synthesising several parts of the chapter, reasoning about why something works, or applying a concept to an unfamiliar situation.',
};

export function describeDifficultyRubric(): string {
  return [
    'Difficulty levels:',
    `- easy: ${DIFFICULTY_RUBRIC.easy}`,
    `- medium: ${DIFFICULTY_RUBRIC.medium}`,
    `- hard: ${DIFFICULTY_RUBRIC.hard}`,
  ].join('\n');
}
