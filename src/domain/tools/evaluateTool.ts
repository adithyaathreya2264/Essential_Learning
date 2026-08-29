import { ToolDefinition } from './types';

/**
 * Grading call's schema deliberately has no `correct` field. Reasoning and
 * self-reported verdict were tried in one pass (with explanation generated
 * first, per the schema's field order) and still produced contradictions
 * on-device — `correct: true` next to an explanation stating the answer was
 * wrong. That's a model capability limit (weak self-faithfulness on a small
 * model), not a decoding-order problem, so the fix isn't reordering fields
 * further — it's not asking for the verdict here at all. See
 * `evaluateVerdictSchema` below for the second, independent pass that does.
 */
export const evaluateTool: ToolDefinition = {
  name: 'evaluate',
  description: "Grade the student's free-text answer against the chapter and explain the verdict.",
  implemented: true,
  outputSchema: {
    type: 'object',
    properties: {
      explanation: { type: 'string' },
      correctAnswer: { type: 'string' },
    },
    required: ['explanation', 'correctAnswer'],
  },
};

export function buildEvaluatePrompt(question: string, referenceAnswer: string, userAnswer: string): string {
  return [
    "Grade the student's answer to this quiz question, using only the chapter text as ground truth.",
    '',
    `Question: ${question}`,
    `Reference answer: ${referenceAnswer}`,
    `Student's answer: ${userAnswer}`,
    '',
    'Judge on substance, not exact wording — a correct answer phrased differently is still correct.',
    "Write your explanation: reason about whether the student's answer is substantively correct, engaging with what they actually wrote, not just repeating the reference answer. State your verdict clearly within the explanation.",
    'Then give the reference correct answer.',
    'Reply with JSON only, matching the required schema.',
  ].join('\n');
}

/**
 * Second, independent pass: classifies correct/incorrect from the grading
 * explanation alone, mirroring quiz's generate-then-classify split (never
 * trust a model's self-report from the same pass that produced it). Reading
 * a verdict already written in prose is a much easier task for a weak model
 * than writing and judging simultaneously.
 */
export const evaluateVerdictSchema = {
  type: 'object',
  properties: {
    correct: { type: 'boolean' },
  },
  required: ['correct'],
} as const;

export function buildEvaluateVerdictPrompt(explanation: string): string {
  return [
    "Read this grading explanation of a student's quiz answer.",
    '',
    `Explanation: ${explanation}`,
    '',
    'Based only on what this explanation says, was the answer correct?',
    'Reply with JSON only, matching the required schema.',
  ].join('\n');
}
