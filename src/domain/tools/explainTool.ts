import { ToolDefinition } from './types';

/**
 * Free-text output by design: an explanation is prose the student reads, so
 * constraining it to JSON would only add parsing failure modes and strip the
 * formatting that makes it readable.
 */
export const explainTool: ToolDefinition = {
  name: 'explain',
  description:
    'Explain a concept, term, or passage from the chapter in more depth. Use when the student wants to understand something.',
  implemented: true,
};

export function buildExplainPrompt(question: string): string {
  return [
    'The student asked for an explanation. Answer using only the chapter text.',
    'Explain clearly and directly. Use a short example from the chapter if one helps.',
    '',
    `Student's question: ${question}`,
  ].join('\n');
}
