import { describeDifficultyRubric } from '../../ai/prompt/difficultyRubric';
import { DifficultyLevel } from '../../core/constants/difficulty';
import { ToolDefinition } from './types';

/**
 * Generation call's own schema. Its per-question `difficulty` is a draft the
 * generator claims, not authoritative — a separate classification pass
 * (below) independently scores actual difficulty, and that's what gets
 * stored and shown to the student. Never trust a model's self-grading.
 */
export const quizTool: ToolDefinition = {
  name: 'quiz',
  description: 'Generate quiz questions about the chapter to test understanding.',
  implemented: true,
  outputSchema: {
    type: 'object',
    properties: {
      questions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            answer: { type: 'string' },
            difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
            explanation: { type: 'string' },
          },
          required: ['question', 'answer', 'difficulty', 'explanation'],
        },
      },
    },
    required: ['questions'],
  },
};

export function buildQuizGenerationPrompt(difficulty: DifficultyLevel, count: number): string {
  const target =
    difficulty === 'mix'
      ? 'Generate a roughly even mix of easy, medium, and hard questions.'
      : `Target the "${difficulty}" difficulty level for every question.`;

  return [
    `Generate ${count} quiz questions testing understanding of the chapter.`,
    'Use only the chapter text — never introduce facts it does not contain.',
    '',
    describeDifficultyRubric(),
    '',
    target,
    'For each question, also give the correct answer and a short explanation of why it is correct.',
    'Reply with JSON only, matching the required schema.',
  ].join('\n');
}

/** Second, independent pass: classifies each just-generated question's actual difficulty. */
export const quizClassificationSchema = {
  type: 'object',
  properties: {
    classifications: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'number' },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
        },
        required: ['index', 'difficulty'],
      },
    },
  },
  required: ['classifications'],
} as const;

export function buildQuizClassificationPrompt(
  questions: Array<{ question: string; answer: string }>
): string {
  const listed = questions
    .map((q, i) => `${i}. Question: ${q.question}\n   Answer: ${q.answer}`)
    .join('\n');

  return [
    'Classify the actual difficulty of each quiz question below, independent of any difficulty label it may already carry.',
    '',
    describeDifficultyRubric(),
    '',
    listed,
    '',
    'Reply with JSON only: one classification per question, using its index above.',
  ].join('\n');
}
