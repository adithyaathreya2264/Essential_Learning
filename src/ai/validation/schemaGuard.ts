/**
 * Backstop validation for model output.
 *
 * The engine claims constrained decoding *guarantees* schema conformance. This
 * layer exists anyway: that guarantee is unproven against this app's real
 * usage, and a malformed parse reaching the UI would be a silent wrong answer
 * rather than a visible error. Cheap insurance on a young dependency.
 */

export type ParseResult<T> = { ok: true; value: T } | { ok: false; reason: string };

/**
 * Models sometimes wrap JSON in markdown fences even under constraint.
 * Strip them before parsing rather than failing on a formatting artifact.
 */
function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1].trim() : trimmed;
}

export function parseJsonObject(raw: string): ParseResult<Record<string, unknown>> {
  const cleaned = stripCodeFences(raw);
  if (cleaned.length === 0) {
    return { ok: false, reason: 'empty response' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { ok: false, reason: 'response was not valid JSON' };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, reason: 'response was not a JSON object' };
  }

  return { ok: true, value: parsed as Record<string, unknown> };
}

/** Validates that a field holds one of a known set of string values. */
export function parseEnumField<T extends string>(
  obj: Record<string, unknown>,
  field: string,
  allowed: readonly T[]
): ParseResult<T> {
  const value = obj[field];
  if (typeof value !== 'string') {
    return { ok: false, reason: `missing "${field}"` };
  }
  if (!allowed.includes(value as T)) {
    return { ok: false, reason: `"${value}" is not a recognised ${field}` };
  }
  return { ok: true, value: value as T };
}

/** Validates that a field holds a non-empty plain string (no fixed set of values). */
export function parseStringField(obj: Record<string, unknown>, field: string): ParseResult<string> {
  const value = obj[field];
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { ok: false, reason: `missing "${field}"` };
  }
  return { ok: true, value };
}

/** Validates that a field holds a number. */
export function parseNumberField(obj: Record<string, unknown>, field: string): ParseResult<number> {
  const value = obj[field];
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return { ok: false, reason: `missing "${field}"` };
  }
  return { ok: true, value };
}

/** Validates that a field holds a boolean. */
export function parseBooleanField(obj: Record<string, unknown>, field: string): ParseResult<boolean> {
  const value = obj[field];
  if (typeof value !== 'boolean') {
    return { ok: false, reason: `missing "${field}"` };
  }
  return { ok: true, value };
}

/** Validates that a field holds an array, parsing and collecting each item with `itemParser`. */
export function parseArrayField<T>(
  obj: Record<string, unknown>,
  field: string,
  itemParser: (item: unknown, index: number) => ParseResult<T>
): ParseResult<T[]> {
  const value = obj[field];
  if (!Array.isArray(value)) {
    return { ok: false, reason: `missing "${field}"` };
  }

  const items: T[] = [];
  for (let i = 0; i < value.length; i++) {
    const result = itemParser(value[i], i);
    if (!result.ok) {
      return { ok: false, reason: `${field}[${i}]: ${result.reason}` };
    }
    items.push(result.value);
  }
  return { ok: true, value: items };
}
