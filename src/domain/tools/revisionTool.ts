import { ToolDefinition } from './types';

/**
 * Schema-only scaffolding, intentionally unused: the reminder screen
 * (app/chapter/[chapterId]/reminder.tsx) is a plain form, not an AI call —
 * per the chapter action sheet's `requiresAi: false` flag — so there's no
 * caller for this yet. Kept for a possible future conversational entry point.
 */
export const revisionTool: ToolDefinition = {
  name: 'revise',
  description: 'Set a reminder to revise this chapter later.',
  implemented: false,
  outputSchema: {
    type: 'object',
    properties: {
      relativeDays: { type: 'number' },
      note: { type: 'string' },
    },
    required: ['relativeDays'],
  },
};
