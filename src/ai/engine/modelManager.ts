import { createLLM, DEFAULT_CHANNELS, isMemoryError, type LiteRTLMInstance } from 'react-native-litert-lm';
import { getVerifiedModelInstall } from '../../data/repositories/modelRepository';

/**
 * Total KV-cache budget (prompt + history + output), tried in descending
 * order until one fits. 8192 comfortably holds a chapter plus conversation
 * history, but on-device headroom varies: a background-heavy phone can have
 * only ~3GB actually free even with 7GB+ total RAM. The engine's own
 * pre-flight check rejects a budget that won't fit with a `MemoryError`
 * *before* attempting the expensive weight load, so stepping down is cheap —
 * this is the library's own suggested remediation ("lower maxContextTokens
 * and retry"), just automated instead of surfaced as a dead end.
 */
const CONTEXT_TOKEN_STEPS = [8192, 4096, 3072, 2048];

/**
 * Low, not zero: structured output (intent classification now, quiz/flashcard
 * JSON later) adheres to schemas best at low temperature, and this is a study
 * tool where fidelity to the source chapter matters more than phrasing variety.
 * Temperature is load-time only in this engine, so one value serves both the
 * free-text and constrained-decoding paths.
 */
const TEMPERATURE = 0.3;

export type ModelLoadFailure =
  | { kind: 'no-model' }
  | { kind: 'out-of-memory'; message: string }
  | { kind: 'unknown'; message: string };

export class ModelLoadError extends Error {
  readonly failure: ModelLoadFailure;

  constructor(failure: ModelLoadFailure) {
    super(failure.kind === 'no-model' ? 'No verified model is installed' : failure.message);
    this.failure = failure;
  }
}

let instance: LiteRTLMInstance | null = null;
let loadPromise: Promise<LiteRTLMInstance> | null = null;
let loadedContextTokens: number | null = null;

/**
 * The KV-cache token budget the currently loaded model actually got — whichever
 * step in `CONTEXT_TOKEN_STEPS` succeeded, which varies by device memory. Callers
 * that need to fit content into that budget (e.g. a chapter's system prompt)
 * should size against this, not against the largest step.
 */
export function getLoadedContextTokenBudget(): number | null {
  return loadedContextTokens;
}

/**
 * Loads the installed model once and reuses it. Always loads from the local
 * file this app downloaded and verified itself (Phase 3) — never from a URL,
 * so the engine never re-fetches multiple gigabytes behind our back.
 */
export function getLoadedModel(): Promise<LiteRTLMInstance> {
  if (instance) return Promise.resolve(instance);
  if (!loadPromise) {
    loadPromise = load().catch((error) => {
      // Let the next attempt retry rather than caching the rejection forever.
      loadPromise = null;
      throw error;
    });
  }
  return loadPromise;
}

async function load(): Promise<LiteRTLMInstance> {
  const install = await getVerifiedModelInstall();
  if (!install?.localPath) {
    throw new ModelLoadError({ kind: 'no-model' });
  }

  // Gemma emits reasoning wrapped in <thinking>...</thinking> (the library's
  // default channel marker); Qwen3 uses the singular <think>...</think>
  // instead (confirmed on-device — Qwen3 0.6B's chain-of-thought otherwise
  // leaks into the chat as literal visible text since it doesn't match
  // DEFAULT_CHANNELS). Registering both keeps either model's reasoning out of
  // the user-facing stream without needing to know which model is loaded.
  const llm = createLLM({
    streamChannels: [...DEFAULT_CHANNELS, { type: 'thinking', start: '<think>', end: '</think>' }],
  });
  let lastMemoryError: unknown = null;

  for (const maxContextTokens of CONTEXT_TOKEN_STEPS) {
    const attemptStart = Date.now();
    try {
      await llm.loadModel(install.localPath, {
        backend: 'cpu',
        maxContextTokens,
        temperature: TEMPERATURE,
        enableStructuredOutput: true,
        // Gemma 4 reasoning is on by default with an unlimited budget. On a CPU
        // backend that decodes tens of tokens/sec, that is a long silent wait
        // before any visible output, so it stays off for explain/summarize.
        thinking: { enabled: false },
      });
      instance = llm;
      loadedContextTokens = maxContextTokens;
      console.log(`[modelManager] loaded OK at ${maxContextTokens} tokens in ${Date.now() - attemptStart}ms`);
      return llm;
    } catch (error) {
      const elapsed = Date.now() - attemptStart;
      if (!isMemoryError(error)) {
        console.log(`[modelManager] non-memory error at ${maxContextTokens} tokens after ${elapsed}ms:`, error);
        throw new ModelLoadError({
          kind: 'unknown',
          message: error instanceof Error ? error.message : 'The model failed to load.',
        });
      }
      // Pre-flight rejection only — no weights were mapped, so the next,
      // smaller budget is safe to try immediately.
      console.log(
        `[modelManager] memory error at ${maxContextTokens} tokens after ${elapsed}ms`,
        JSON.stringify(error.estimate)
      );
      lastMemoryError = error;
    }
  }

  const smallestBudget = CONTEXT_TOKEN_STEPS[CONTEXT_TOKEN_STEPS.length - 1];
  const estimate = isMemoryError(lastMemoryError) ? lastMemoryError.estimate : null;
  const shortfallMB = estimate ? Math.ceil(-estimate.headroomBytes / (1024 * 1024)) : null;

  throw new ModelLoadError({
    kind: 'out-of-memory',
    message:
      shortfallMB != null
        ? `Not enough free memory to load the model, even at the smallest context size (${smallestBudget} tokens). Free up about ${shortfallMB}MB more and try again.`
        : 'Not enough free memory to load the model. Close some apps and try again.',
  });
}

export function isModelLoaded(): boolean {
  return instance !== null;
}

/**
 * Frees engine memory while keeping the manager reusable — a later
 * getLoadedModel() reloads from disk.
 */
export async function unloadModel(): Promise<void> {
  const current = instance;
  instance = null;
  loadPromise = null;
  loadedContextTokens = null;
  if (current) {
    await current.unload();
  }
}
