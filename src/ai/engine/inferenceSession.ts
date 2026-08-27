import type { ConversationHandle } from 'react-native-litert-lm';
import { buildChapterSystemPrompt } from '../prompt/systemPrompt';
import {
  buildIntentPrompt,
  Intent,
  INTENT_VALUES,
  intentSchema,
} from '../../domain/tools/intentTool';
import { buildExplainPrompt } from '../../domain/tools/explainTool';
import { buildSummarizePrompt } from '../../domain/tools/summarizeTool';
import {
  buildQuizClassificationPrompt,
  buildQuizGenerationPrompt,
  quizClassificationSchema,
  quizTool,
} from '../../domain/tools/quizTool';
import {
  buildEvaluatePrompt,
  buildEvaluateVerdictPrompt,
  evaluateTool,
  evaluateVerdictSchema,
} from '../../domain/tools/evaluateTool';
import { buildFlashcardGenerationPrompt, flashcardTool } from '../../domain/tools/flashcardTool';
import { DifficultyLevel } from '../../core/constants/difficulty';
import { GeneratedQuestion } from '../../data/repositories/quizRepository';
import {
  parseArrayField,
  parseBooleanField,
  parseEnumField,
  parseJsonObject,
  parseNumberField,
  parseStringField,
  ParseResult,
} from '../validation/schemaGuard';
import { withParseRetry } from '../validation/retryPolicy';
import { getLoadedContextTokenBudget, getLoadedModel } from './modelManager';

/** Thrown when quiz generation/classification/grading exhausts its retry cap. Unlike intent
 * classification, there is no safe silent fallback here — the caller must show an honest error. */
export class ToolGenerationError extends Error {
  constructor(reason: string) {
    super(`The AI's response didn't come out right (${reason}). Try again.`);
  }
}

/**
 * Thrown when a chapter's system prompt alone would eat the model's entire
 * loaded context budget, leaving no room for conversation history or output.
 * Chars-per-token is a rough heuristic (the engine exposes no tokenizer), so
 * the reserve below is deliberately generous rather than cutting it fine.
 */
export class ChapterTooLongError extends Error {
  constructor() {
    super(
      'This chapter is too long for the AI to work with in one go. Try splitting it into smaller chapters from the chapter review screen.'
    );
  }
}

const CHARS_PER_TOKEN_ESTIMATE = 4;
/** Reserved for conversation history and output tokens — the system prompt should only ever claim the rest. */
const RESERVE_FRACTION_FOR_HISTORY_AND_OUTPUT = 0.5;

function assertChapterFitsContext(chapterTitle: string, chapterContent: string): void {
  const budget = getLoadedContextTokenBudget();
  if (budget == null) return; // Not loaded yet — the load call downstream will surface its own error.

  const promptChars = buildChapterSystemPrompt(chapterTitle, chapterContent).length;
  const estimatedTokens = promptChars / CHARS_PER_TOKEN_ESTIMATE;
  const availableForPrompt = budget * (1 - RESERVE_FRACTION_FOR_HISTORY_AND_OUTPUT);

  if (estimatedTokens > availableForPrompt) {
    throw new ChapterTooLongError();
  }
}

function asObject(value: unknown): ParseResult<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, reason: 'entry was not an object' };
  }
  return { ok: true, value: value as Record<string, unknown> };
}

/**
 * One conversation per chapter, cached so returning to a chapter keeps its
 * context instead of re-prefilling the chapter text on every visit. The engine
 * holds a single native context and replays transcripts when switching, so
 * these handles are cheap to keep around.
 */
const conversations = new Map<string, ConversationHandle>();

/**
 * Intent classification runs on its own conversation, never the chapter's.
 * Sharing the chapter conversation would leave its raw JSON exchange in that
 * conversation's transcript — the next explain/summarize call would then see
 * a prior "assistant" turn shaped like `{"intent":...}` in its own context
 * and imitate that format instead of answering, an effect that's sharp on
 * small models (observed firsthand on Qwen3 0.6B). Classification doesn't
 * need chapter content, so an isolated conversation costs nothing there.
 */
let classifierConversation: ConversationHandle | null = null;

async function getClassifierConversation(): Promise<ConversationHandle> {
  if (classifierConversation) return classifierConversation;
  const llm = await getLoadedModel();
  classifierConversation = llm.createConversation();
  return classifierConversation;
}

export async function getChapterConversation(
  chapterId: string,
  chapterTitle: string,
  chapterContent: string
): Promise<ConversationHandle> {
  const existing = conversations.get(chapterId);
  if (existing) return existing;

  const llm = await getLoadedModel();
  assertChapterFitsContext(chapterTitle, chapterContent);
  const conversation = llm.createConversation({
    systemPrompt: buildChapterSystemPrompt(chapterTitle, chapterContent),
  });

  conversations.set(chapterId, conversation);
  return conversation;
}

export async function releaseChapterConversation(chapterId: string): Promise<void> {
  const conversation = conversations.get(chapterId);
  if (!conversation) return;
  conversations.delete(chapterId);
  await conversation.release();
}

/**
 * Quiz generation/classification/grading and flashcard generation are all
 * structured-JSON calls, kept off the chapter's visible chat conversation for
 * the same reason intent classification got its own conversation: their raw
 * JSON turns would sit in that transcript and bias the next free-text
 * explain/summarize call. Unlike the classifier, these calls do need chapter
 * content to ground questions/cards, so this is seeded per-chapter like
 * `getChapterConversation`, just kept on a separate map — shared by every
 * structured tool, not just quiz.
 */
const structuredToolConversations = new Map<string, ConversationHandle>();

async function getStructuredToolConversation(
  chapterId: string,
  chapterTitle: string,
  chapterContent: string
): Promise<ConversationHandle> {
  const existing = structuredToolConversations.get(chapterId);
  if (existing) return existing;

  const llm = await getLoadedModel();
  assertChapterFitsContext(chapterTitle, chapterContent);
  const conversation = llm.createConversation({
    systemPrompt: buildChapterSystemPrompt(chapterTitle, chapterContent),
  });

  structuredToolConversations.set(chapterId, conversation);
  return conversation;
}

/**
 * Decides which tool a message maps to, using constrained decoding against a
 * closed enum. Returns 'ambiguous' when the model itself is unsure — the UI
 * then asks the student rather than guessing, per the app's design rules.
 */
export async function classifyIntent(message: string): Promise<Intent> {
  const conversation = await getClassifierConversation();
  const outcome = await withParseRetry(async () => {
    const raw = await conversation.execute(
      [{ type: 'text', text: buildIntentPrompt(message) }],
      undefined,
      { responseSchema: JSON.stringify(intentSchema), maxOutputTokens: 32 }
    );

    const parsed = parseJsonObject(raw);
    if (!parsed.ok) return parsed;
    return parseEnumField(parsed.value, 'intent', INTENT_VALUES);
  });

  // A classifier that won't parse shouldn't block the student — fall back to
  // asking them, which is the same honest path as a genuinely unclear request.
  return outcome.ok ? outcome.value : 'ambiguous';
}

export type StreamHandlers = {
  onToken: (token: string) => void;
};

/**
 * Runs the chosen tool and streams its prose response token-by-token.
 *
 * Uses executeWithEvents rather than execute: thinking models (Qwen3, and
 * Gemma with `thinking.enabled` not fully suppressed at this backend) emit
 * reasoning inline in the same token stream, wrapped in channel markers. The
 * resolved promise from the underlying call still contains that raw text —
 * only the event stream is split by type — so the clean answer is built here
 * from 'token' events alone, dropping 'thinking' (and unused 'toolCall')
 * content instead of trusting the resolved string.
 */
export async function runTool(
  conversation: ConversationHandle,
  tool: 'explain' | 'summarize',
  message: string,
  handlers: StreamHandlers
): Promise<string> {
  const prompt = tool === 'explain' ? buildExplainPrompt(message) : buildSummarizePrompt(message);

  let finalText = '';
  await conversation.executeWithEvents([{ type: 'text', text: prompt }], (event) => {
    if (event.type !== 'token' || !event.text) return;
    finalText += event.text;
    handlers.onToken(event.text);
  });
  return finalText;
}

type DraftQuestion = { question: string; answer: string; difficulty: 'easy' | 'medium' | 'hard'; explanation: string };

function parseDraftQuestion(item: unknown): ParseResult<DraftQuestion> {
  const obj = asObject(item);
  if (!obj.ok) return obj;
  const question = parseStringField(obj.value, 'question');
  if (!question.ok) return question;
  const answer = parseStringField(obj.value, 'answer');
  if (!answer.ok) return answer;
  const difficulty = parseEnumField(obj.value, 'difficulty', ['easy', 'medium', 'hard'] as const);
  if (!difficulty.ok) return difficulty;
  const explanation = parseStringField(obj.value, 'explanation');
  if (!explanation.ok) return explanation;
  return {
    ok: true,
    value: { question: question.value, answer: answer.value, difficulty: difficulty.value, explanation: explanation.value },
  };
}

type Classification = { index: number; difficulty: 'easy' | 'medium' | 'hard' };

function parseClassification(item: unknown): ParseResult<Classification> {
  const obj = asObject(item);
  if (!obj.ok) return obj;
  const index = parseNumberField(obj.value, 'index');
  if (!index.ok) return index;
  const difficulty = parseEnumField(obj.value, 'difficulty', ['easy', 'medium', 'hard'] as const);
  if (!difficulty.ok) return difficulty;
  return { ok: true, value: { index: index.value, difficulty: difficulty.value } };
}

/**
 * Generates `count` quiz questions, then runs an independent second pass to
 * classify each one's actual difficulty against the shared rubric — the
 * generator's own self-reported `difficulty` is a draft, never trusted
 * directly. Both passes run on an isolated, chapter-seeded conversation so
 * their JSON exchanges never reach the visible chat transcript.
 */
export async function generateQuiz(
  chapterId: string,
  chapterTitle: string,
  chapterContent: string,
  difficulty: DifficultyLevel,
  count: number
): Promise<GeneratedQuestion[]> {
  const conversation = await getStructuredToolConversation(chapterId, chapterTitle, chapterContent);

  const generation = await withParseRetry(async () => {
    const raw = await conversation.execute(
      [{ type: 'text', text: buildQuizGenerationPrompt(difficulty, count) }],
      undefined,
      { responseSchema: JSON.stringify(quizTool.outputSchema) }
    );
    const parsed = parseJsonObject(raw);
    if (!parsed.ok) return parsed;
    return parseArrayField(parsed.value, 'questions', parseDraftQuestion);
  });

  if (!generation.ok) {
    throw new ToolGenerationError(`quiz generation: ${generation.reason}`);
  }
  const drafts = generation.value;

  const classification = await withParseRetry(async () => {
    const raw = await conversation.execute(
      [{ type: 'text', text: buildQuizClassificationPrompt(drafts.map((d) => ({ question: d.question, answer: d.answer }))) }],
      undefined,
      { responseSchema: JSON.stringify(quizClassificationSchema) }
    );
    const parsed = parseJsonObject(raw);
    if (!parsed.ok) return parsed;
    return parseArrayField(parsed.value, 'classifications', parseClassification);
  });

  // A failed classification pass shouldn't throw away a perfectly good
  // generation — fall back to each draft's own self-reported difficulty
  // rather than blocking the whole quiz on the second call.
  const classifiedByIndex = new Map<number, 'easy' | 'medium' | 'hard'>();
  if (classification.ok) {
    for (const c of classification.value) classifiedByIndex.set(c.index, c.difficulty);
  }

  return drafts.map((d, i) => ({
    question: d.question,
    referenceAnswer: d.answer,
    generatedDifficulty: classifiedByIndex.get(i) ?? d.difficulty,
    explanation: d.explanation,
  }));
}

/**
 * Grades a single free-text answer against the chapter and the question's
 * reference answer. Two independent passes, not one: the first writes the
 * explanation (no verdict asked for), the second classifies correct/incorrect
 * from that explanation alone. Tried as a single combined pass first —
 * confirmed on-device that even with the explanation generated before the
 * verdict field, a small model can still contradict itself (write "this is
 * wrong" and then self-report `correct: true`). Splitting into two calls
 * removes the chance of that specific contradiction: the second call's only
 * input is already-written prose, not something it's simultaneously composing.
 */
export async function evaluateAnswer(
  chapterId: string,
  chapterTitle: string,
  chapterContent: string,
  question: string,
  referenceAnswer: string,
  userAnswer: string
): Promise<{ correct: boolean; explanation: string; correctAnswer: string }> {
  const conversation = await getStructuredToolConversation(chapterId, chapterTitle, chapterContent);

  const grading = await withParseRetry(async () => {
    const raw = await conversation.execute(
      [{ type: 'text', text: buildEvaluatePrompt(question, referenceAnswer, userAnswer) }],
      undefined,
      { responseSchema: JSON.stringify(evaluateTool.outputSchema) }
    );
    const parsed = parseJsonObject(raw);
    if (!parsed.ok) return parsed;
    const explanation = parseStringField(parsed.value, 'explanation');
    if (!explanation.ok) return explanation;
    const correctAnswer = parseStringField(parsed.value, 'correctAnswer');
    if (!correctAnswer.ok) return correctAnswer;
    return { ok: true as const, value: { explanation: explanation.value, correctAnswer: correctAnswer.value } };
  });

  if (!grading.ok) {
    throw new ToolGenerationError(`answer grading: ${grading.reason}`);
  }
  const { explanation, correctAnswer } = grading.value;

  const verdict = await withParseRetry(async () => {
    const raw = await conversation.execute(
      [{ type: 'text', text: buildEvaluateVerdictPrompt(explanation) }],
      undefined,
      { responseSchema: JSON.stringify(evaluateVerdictSchema) }
    );
    const parsed = parseJsonObject(raw);
    if (!parsed.ok) return parsed;
    return parseBooleanField(parsed.value, 'correct');
  });

  if (!verdict.ok) {
    throw new ToolGenerationError(`answer verdict: ${verdict.reason}`);
  }

  return { correct: verdict.value, explanation, correctAnswer };
}

type DraftCard = { front: string; back: string };

function parseDraftCard(item: unknown): ParseResult<DraftCard> {
  const obj = asObject(item);
  if (!obj.ok) return obj;
  const front = parseStringField(obj.value, 'front');
  if (!front.ok) return front;
  const back = parseStringField(obj.value, 'back');
  if (!back.ok) return back;
  return { ok: true, value: { front: front.value, back: back.value } };
}

/**
 * Generates `count` flashcards. Single-pass, unlike quiz's generate-then-classify —
 * flashcards carry no difficulty concept to independently verify.
 */
export async function generateFlashcards(
  chapterId: string,
  chapterTitle: string,
  chapterContent: string,
  count: number
): Promise<DraftCard[]> {
  const conversation = await getStructuredToolConversation(chapterId, chapterTitle, chapterContent);

  const outcome = await withParseRetry(async () => {
    const raw = await conversation.execute(
      [{ type: 'text', text: buildFlashcardGenerationPrompt(count) }],
      undefined,
      { responseSchema: JSON.stringify(flashcardTool.outputSchema) }
    );
    const parsed = parseJsonObject(raw);
    if (!parsed.ok) return parsed;
    return parseArrayField(parsed.value, 'cards', parseDraftCard);
  });

  if (!outcome.ok) {
    throw new ToolGenerationError(`flashcard generation: ${outcome.reason}`);
  }
  return outcome.value;
}
