import { explainTool } from './explainTool';
import { summarizeTool } from './summarizeTool';
import { ToolName } from './types';

/**
 * Tools the router may currently choose. Kept to what is actually implemented:
 * routing to a tool that has no generation logic would produce a dead end, and
 * the doc's rule is to never guess silently. Phases 6-7 add to this list as
 * they wire up real behaviour.
 */
export const ROUTABLE_TOOLS = [explainTool, summarizeTool];

export type Intent = Extract<ToolName, 'explain' | 'summarize'> | 'ambiguous';

export const INTENT_VALUES: Intent[] = ['explain', 'summarize', 'ambiguous'];

/**
 * Constrained-decoding schema. A closed enum means the engine cannot return a
 * tool name we don't handle, which removes a whole class of parsing failure.
 */
export const intentSchema = {
  type: 'object',
  properties: {
    intent: { type: 'string', enum: INTENT_VALUES },
  },
  required: ['intent'],
} as const;

export function buildIntentPrompt(message: string): string {
  return [
    'Classify what the student wants. Reply with JSON only.',
    '',
    'Options:',
    ...ROUTABLE_TOOLS.map((tool) => `- "${tool.name}": ${tool.description}`),
    '- "ambiguous": the request could reasonably mean more than one of the above, or is too vague to tell.',
    '',
    'Choose "ambiguous" rather than guessing when the request is genuinely unclear.',
    '',
    `Student's message: ${message}`,
  ].join('\n');
}
