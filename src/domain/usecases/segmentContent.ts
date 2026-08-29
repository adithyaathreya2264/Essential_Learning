export type SegmentedChapter = {
  title: string;
  content: string;
};

const NUMBERED_HEADING_PATTERN = /^(chapter\s+)?\d{1,3}[.):]\s+\S.{0,80}$/i;
const MARKDOWN_HEADING_PATTERN = /^#{1,3}\s+\S.{0,80}$/;
const ALL_CAPS_HEADING_PATTERN = /^[A-Z][A-Z0-9 .,'&-]{3,60}$/;

const MIN_HEADINGS_FOR_HEADING_SPLIT = 2;
const FALLBACK_CHUNK_SIZE = 4000;

function isHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 90) return false;

  return (
    NUMBERED_HEADING_PATTERN.test(trimmed) ||
    MARKDOWN_HEADING_PATTERN.test(trimmed) ||
    (ALL_CAPS_HEADING_PATTERN.test(trimmed) && trimmed === trimmed.toUpperCase())
  );
}

function cleanHeadingTitle(line: string): string {
  return line.trim().replace(/^#{1,3}\s+/, '');
}

/**
 * Splits one section's content into length-bounded paragraph chunks, titled
 * as "<original title> (part N)" when it doesn't fit in one piece. A heading
 * split has no natural ceiling of its own — two headings in a 300-page PDF
 * would otherwise produce one enormous "chapter" that blows the AI's context
 * budget — so every section is capped the same way the no-heading fallback
 * already caps itself.
 */
function chunkSectionByLength(title: string, content: string): SegmentedChapter[] {
  if (content.length <= FALLBACK_CHUNK_SIZE) return [{ title, content }];

  const paragraphs = content.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  const parts: string[] = [];
  let buffer: string[] = [];
  let bufferLength = 0;

  const flush = () => {
    if (buffer.length === 0) return;
    parts.push(buffer.join('\n\n').trim());
    buffer = [];
    bufferLength = 0;
  };

  for (const paragraph of paragraphs) {
    buffer.push(paragraph);
    bufferLength += paragraph.length;
    if (bufferLength >= FALLBACK_CHUNK_SIZE) flush();
  }
  flush();

  if (parts.length <= 1) return [{ title, content }];
  return parts.map((part, i) => ({ title: `${title} (part ${i + 1})`, content: part }));
}

function splitByHeadings(text: string): SegmentedChapter[] | null {
  const lines = text.split('\n');
  const headingIndexes: number[] = [];

  lines.forEach((line, index) => {
    if (isHeadingLine(line)) headingIndexes.push(index);
  });

  if (headingIndexes.length < MIN_HEADINGS_FOR_HEADING_SPLIT) return null;

  const chapters: SegmentedChapter[] = [];
  for (let i = 0; i < headingIndexes.length; i++) {
    const start = headingIndexes[i];
    const end = i + 1 < headingIndexes.length ? headingIndexes[i + 1] : lines.length;
    const title = cleanHeadingTitle(lines[start]);
    const content = lines.slice(start + 1, end).join('\n').trim();
    if (content.length > 0) {
      chapters.push(...chunkSectionByLength(title, content));
    }
  }

  return chapters.length >= MIN_HEADINGS_FOR_HEADING_SPLIT ? chapters : null;
}

function splitByLength(text: string): SegmentedChapter[] {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  const chapters: SegmentedChapter[] = [];
  let buffer: string[] = [];
  let bufferLength = 0;
  let chapterIndex = 1;

  const flush = () => {
    if (buffer.length === 0) return;
    chapters.push({ title: `Chapter ${chapterIndex}`, content: buffer.join('\n\n').trim() });
    chapterIndex += 1;
    buffer = [];
    bufferLength = 0;
  };

  for (const paragraph of paragraphs) {
    buffer.push(paragraph);
    bufferLength += paragraph.length;
    if (bufferLength >= FALLBACK_CHUNK_SIZE) {
      flush();
    }
  }
  flush();

  return chapters.length > 0 ? chapters : [{ title: 'Chapter 1', content: text.trim() }];
}

export function segmentContent(text: string): SegmentedChapter[] {
  return splitByHeadings(text) ?? splitByLength(text);
}
