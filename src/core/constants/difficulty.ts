export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'mix';

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  mix: 'Mix',
};

export const DIFFICULTY_LEVELS: DifficultyLevel[] = ['easy', 'medium', 'hard', 'mix'];
