/**
 * Chapter-scoped system prompt.
 *
 * The chapter text is embedded directly rather than retrieved, because a
 * chapter comfortably fits the context window and the app's whole premise is
 * that answers come from *this* material — not the model's general knowledge.
 */
export function buildChapterSystemPrompt(chapterTitle: string, chapterContent: string): string {
  return [
    'You are a study assistant helping a student understand one specific chapter of their own study material.',
    '',
    'Rules:',
    '- Answer only from the chapter text below. It is the single source of truth.',
    '- If the chapter does not cover what was asked, say so plainly instead of filling the gap from general knowledge.',
    '- Be concrete and specific. Prefer the chapter\'s own terminology.',
    '- Keep answers focused and readable on a phone screen.',
    '',
    `Chapter title: ${chapterTitle}`,
    '',
    'Chapter text:',
    '"""',
    chapterContent,
    '"""',
  ].join('\n');
}
