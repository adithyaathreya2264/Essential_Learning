const PAGE_NUMBER_PATTERN = /^(page\s+)?\d{1,4}(\s*(of|\/)\s*\d{1,4})?$/i;

function isLikelyPageNumberOrArtifact(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0) return false;
  return PAGE_NUMBER_PATTERN.test(trimmed);
}

function stripRepeatedHeaderFooterLines(lines: string[]): string[] {
  if (lines.length < 20) return lines;

  const counts = new Map<string, number>();
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.length > 80) continue;
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
  }

  const repeatedThreshold = Math.max(3, Math.floor(lines.length / 30));
  const repeated = new Set(
    [...counts.entries()].filter(([, count]) => count >= repeatedThreshold).map(([text]) => text)
  );

  if (repeated.size === 0) return lines;
  return lines.filter((line) => !repeated.has(line.trim()));
}

export function normalizeText(raw: string): string {
  const unixNewlines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = unixNewlines.split('\n').map((line) => line.replace(/[ \t]+$/g, ''));

  const withoutArtifacts = lines.filter((line) => !isLikelyPageNumberOrArtifact(line));
  const withoutHeadersFooters = stripRepeatedHeaderFooterLines(withoutArtifacts);

  const collapsed = withoutHeadersFooters
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ');

  return collapsed.trim();
}
