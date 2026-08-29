export const SCHEMA_VERSION = 8;

export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS Subject (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS Chapter (
  id TEXT PRIMARY KEY NOT NULL,
  subjectId TEXT NOT NULL REFERENCES Subject(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  orderIndex INTEGER NOT NULL,
  createdAt INTEGER NOT NULL
);
`;

export const CREATE_MODEL_INSTALL_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS ModelInstall (
  modelId TEXT PRIMARY KEY NOT NULL,
  status TEXT NOT NULL,
  bytesDownloaded INTEGER NOT NULL DEFAULT 0,
  totalBytes INTEGER NOT NULL DEFAULT 0,
  resumeData TEXT,
  localPath TEXT,
  updatedAt INTEGER NOT NULL
);
`;

export const CREATE_SETTING_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS Setting (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;

export const CREATE_CHAT_MESSAGE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS ChatMessage (
  id TEXT PRIMARY KEY NOT NULL,
  chapterId TEXT NOT NULL REFERENCES Chapter(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  createdAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ChatMessage_chapter ON ChatMessage(chapterId, createdAt);
`;

export const CREATE_QUIZ_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS Quiz (
  id TEXT PRIMARY KEY NOT NULL,
  chapterId TEXT NOT NULL REFERENCES Chapter(id) ON DELETE CASCADE,
  requestedDifficulty TEXT NOT NULL,
  questionCount INTEGER NOT NULL,
  score INTEGER,
  userFeedback TEXT,
  completedAt INTEGER,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS QuizQuestion (
  id TEXT PRIMARY KEY NOT NULL,
  quizId TEXT NOT NULL REFERENCES Quiz(id) ON DELETE CASCADE,
  orderIndex INTEGER NOT NULL,
  question TEXT NOT NULL,
  referenceAnswer TEXT NOT NULL,
  generatedDifficulty TEXT NOT NULL,
  explanation TEXT NOT NULL,
  userAnswer TEXT,
  isCorrect INTEGER,
  gradingExplanation TEXT
);

CREATE INDEX IF NOT EXISTS idx_QuizQuestion_quiz ON QuizQuestion(quizId, orderIndex);
CREATE INDEX IF NOT EXISTS idx_Quiz_chapter ON Quiz(chapterId, createdAt);
`;

export const CREATE_FLASHCARD_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS FlashcardDeck (
  id TEXT PRIMARY KEY NOT NULL,
  chapterId TEXT NOT NULL UNIQUE REFERENCES Chapter(id) ON DELETE CASCADE,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS Flashcard (
  id TEXT PRIMARY KEY NOT NULL,
  deckId TEXT NOT NULL REFERENCES FlashcardDeck(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS CardReviewState (
  cardId TEXT PRIMARY KEY NOT NULL REFERENCES Flashcard(id) ON DELETE CASCADE,
  due INTEGER NOT NULL,
  stability REAL NOT NULL,
  difficulty REAL NOT NULL,
  elapsedDays REAL NOT NULL,
  scheduledDays REAL NOT NULL,
  learningSteps INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  lapses INTEGER NOT NULL,
  state INTEGER NOT NULL,
  lastReview INTEGER
);

CREATE INDEX IF NOT EXISTS idx_Flashcard_deck ON Flashcard(deckId);
CREATE INDEX IF NOT EXISTS idx_CardReviewState_due ON CardReviewState(due);
`;

export const CREATE_REMINDER_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS Reminder (
  id TEXT PRIMARY KEY NOT NULL,
  chapterId TEXT NOT NULL REFERENCES Chapter(id) ON DELETE CASCADE,
  note TEXT,
  remindAt INTEGER NOT NULL,
  status TEXT NOT NULL,
  createdAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_Reminder_status_remindAt ON Reminder(status, remindAt);
CREATE INDEX IF NOT EXISTS idx_Reminder_chapter ON Reminder(chapterId);
`;

/**
 * Append-only log of individual review events, separate from CardReviewState
 * (which upserts one row per card holding only its *current* FSRS state).
 * Weekly/streak stats need to count every review that happened, including
 * repeat reviews of the same card within the window — the upsert table alone
 * can't answer that.
 */
export const CREATE_REVIEW_LOG_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS ReviewLog (
  id TEXT PRIMARY KEY NOT NULL,
  cardId TEXT NOT NULL REFERENCES Flashcard(id) ON DELETE CASCADE,
  chapterId TEXT NOT NULL REFERENCES Chapter(id) ON DELETE CASCADE,
  rating TEXT NOT NULL,
  reviewedAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ReviewLog_reviewedAt ON ReviewLog(reviewedAt);
CREATE INDEX IF NOT EXISTS idx_ReviewLog_chapter ON ReviewLog(chapterId, reviewedAt);
`;
