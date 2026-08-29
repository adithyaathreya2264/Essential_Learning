import { ToolDefinition } from './types';

export const flashcardTool: ToolDefinition = {
  name: 'flashcards',
  description: 'Generate front/back flashcards from the chapter for quick recall practice.',
  implemented: true,
  outputSchema: {
    type: 'object',
    properties: {
      cards: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            front: { type: 'string' },
            back: { type: 'string' },
          },
          required: ['front', 'back'],
        },
      },
    },
    required: ['cards'],
  },
};

export function buildFlashcardGenerationPrompt(count: number): string {
  return [
    `Generate ${count} flashcards for quick recall practice on this chapter.`,
    'Use only the chapter text — never introduce facts it does not contain.',
    'Each card\'s front should be a short question, term, or prompt; the back should be a concise, direct answer.',
    'Favor discrete, well-scoped facts and concepts over broad or multi-part questions — these are for fast recall, not deep reasoning.',
    'Reply with JSON only, matching the required schema.',
  ].join('\n');
}
