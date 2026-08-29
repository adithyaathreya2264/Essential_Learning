import { ParseResult } from './schemaGuard';

/**
 * Total attempts for an operation whose output must parse. Hard-capped on
 * purpose: an unbounded retry against a local model is a silent battery drain
 * with no visible progress, which is exactly the "silent loop" the app's
 * design rules forbid. Two attempts covers a one-off malformed generation;
 * a consistent failure is a real problem the user should be told about.
 */
export const MAX_ATTEMPTS = 2;

export type AttemptOutcome<T> = { ok: true; value: T } | { ok: false; reason: string };

/**
 * Runs `attempt` until it parses cleanly or the cap is reached, returning the
 * last failure reason so the caller can surface something honest.
 */
export async function withParseRetry<T>(
  attempt: (attemptNumber: number) => Promise<ParseResult<T>>
): Promise<AttemptOutcome<T>> {
  let lastReason = 'unknown error';

  for (let i = 1; i <= MAX_ATTEMPTS; i++) {
    let result: ParseResult<T>;
    try {
      result = await attempt(i);
    } catch (error) {
      lastReason = error instanceof Error ? error.message : 'generation failed';
      continue;
    }

    if (result.ok) return { ok: true, value: result.value };
    lastReason = result.reason;
  }

  return { ok: false, reason: lastReason };
}
