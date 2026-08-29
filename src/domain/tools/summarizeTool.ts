import { ToolDefinition } from './types';

export const summarizeTool: ToolDefinition = {
  name: 'summarize',
  description:
    'Condense the chapter (or a named part of it) into its key points. Use when the student wants an overview or the main takeaways.',
  implemented: true,
};

export function buildSummarizePrompt(request: string): string {
  return [
    'The student asked for a summary. Summarise using only the chapter text.',
    'Lead with the single most important idea, then give the key supporting points as a short list.',
    'Do not pad with detail the chapter does not contain.',
    '',
    `Student's request: ${request}`,
  ].join('\n');
}
