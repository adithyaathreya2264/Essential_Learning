import { getDb } from '../db/client';
import { DifficultyLevel } from '../../core/constants/difficulty';

export type Quiz = {
  id: string;
  chapterId: string;
  requestedDifficulty: DifficultyLevel;
  questionCount: number;
  score: number | null;
  userFeedback: QuizFeedback | null;
  completedAt: number | null;
  createdAt: number;
};

export type QuizFeedback = 'too_easy' | 'just_right' | 'too_hard';

export type QuizQuestion = {
  id: string;
  quizId: string;
  orderIndex: number;
  question: string;
  referenceAnswer: string;
  generatedDifficulty: Exclude<DifficultyLevel, 'mix'>;
  explanation: string;
  userAnswer: string | null;
  isCorrect: boolean | null;
  gradingExplanation: string | null;
};

export type GeneratedQuestion = {
  question: string;
  referenceAnswer: string;
  generatedDifficulty: Exclude<DifficultyLevel, 'mix'>;
  explanation: string;
};

/** Raw SQLite row shape for QuizQuestion — isCorrect is stored as 0/1. */
type QuizQuestionRow = Omit<QuizQuestion, 'isCorrect'> & { isCorrect: number | null };

function toQuizQuestion(row: QuizQuestionRow): QuizQuestion {
  return { ...row, isCorrect: row.isCorrect === null ? null : row.isCorrect === 1 };
}

export async function createQuiz(
  chapterId: string,
  requestedDifficulty: DifficultyLevel,
  questions: GeneratedQuestion[]
): Promise<Quiz> {
  const db = await getDb();
  const now = Date.now();
  const quizId = `quiz_${now}_${Math.random().toString(36).slice(2, 8)}`;

  await db.runAsync(
    'INSERT INTO Quiz (id, chapterId, requestedDifficulty, questionCount, score, userFeedback, completedAt, createdAt) VALUES (?, ?, ?, ?, NULL, NULL, NULL, ?)',
    [quizId, chapterId, requestedDifficulty, questions.length, now]
  );

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const id = `quizq_${now}_${i}_${Math.random().toString(36).slice(2, 8)}`;
    await db.runAsync(
      'INSERT INTO QuizQuestion (id, quizId, orderIndex, question, referenceAnswer, generatedDifficulty, explanation, userAnswer, isCorrect, gradingExplanation) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL)',
      [id, quizId, i, q.question, q.referenceAnswer, q.generatedDifficulty, q.explanation]
    );
  }

  return {
    id: quizId,
    chapterId,
    requestedDifficulty,
    questionCount: questions.length,
    score: null,
    userFeedback: null,
    completedAt: null,
    createdAt: now,
  };
}

export async function getQuiz(quizId: string): Promise<Quiz | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Quiz>('SELECT * FROM Quiz WHERE id = ?', [quizId]);
  return row ?? null;
}

export async function listQuestionsForQuiz(quizId: string): Promise<QuizQuestion[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<QuizQuestionRow>(
    'SELECT * FROM QuizQuestion WHERE quizId = ? ORDER BY orderIndex ASC',
    [quizId]
  );
  return rows.map(toQuizQuestion);
}

export async function recordAnswer(
  questionId: string,
  userAnswer: string,
  isCorrect: boolean,
  gradingExplanation: string
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE QuizQuestion SET userAnswer = ?, isCorrect = ?, gradingExplanation = ? WHERE id = ?',
    [userAnswer, isCorrect ? 1 : 0, gradingExplanation, questionId]
  );
}

export async function completeQuiz(quizId: string, score: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE Quiz SET score = ?, completedAt = ? WHERE id = ?', [score, Date.now(), quizId]);
}

export async function setQuizFeedback(quizId: string, feedback: QuizFeedback): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE Quiz SET userFeedback = ? WHERE id = ?', [feedback, quizId]);
}

export async function listQuizzesForChapter(chapterId: string): Promise<Quiz[]> {
  const db = await getDb();
  return db.getAllAsync<Quiz>('SELECT * FROM Quiz WHERE chapterId = ? ORDER BY createdAt DESC', [chapterId]);
}

export type ChapterQuizStats = {
  /** Average percent correct across completed quizzes (score is a raw correct-count, not a percentage). */
  avgPercent: number;
  completedCount: number;
};

/** Average score percentage of completed quizzes for a chapter, or null if none completed yet. */
export async function getChapterQuizStats(chapterId: string): Promise<ChapterQuizStats | null> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ score: number; questionCount: number }>(
    'SELECT score, questionCount FROM Quiz WHERE chapterId = ? AND score IS NOT NULL',
    [chapterId]
  );
  return statsFromRows(rows);
}

/** Same as getChapterQuizStats, rolled up across every chapter in a subject. */
export async function getSubjectQuizStats(subjectId: string): Promise<ChapterQuizStats | null> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ score: number; questionCount: number }>(
    `SELECT q.score as score, q.questionCount as questionCount
     FROM Quiz q JOIN Chapter c ON c.id = q.chapterId
     WHERE c.subjectId = ? AND q.score IS NOT NULL`,
    [subjectId]
  );
  return statsFromRows(rows);
}

/** Same as getChapterQuizStats, rolled up across every quiz in the app — the Home dashboard's "avg quiz score". */
export async function getOverallQuizStats(): Promise<ChapterQuizStats | null> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ score: number; questionCount: number }>(
    'SELECT score, questionCount FROM Quiz WHERE score IS NOT NULL'
  );
  return statsFromRows(rows);
}

function statsFromRows(rows: { score: number; questionCount: number }[]): ChapterQuizStats | null {
  if (rows.length === 0) return null;
  const avgPercent = rows.reduce((sum, r) => sum + r.score / r.questionCount, 0) / rows.length;
  return { avgPercent: avgPercent * 100, completedCount: rows.length };
}
