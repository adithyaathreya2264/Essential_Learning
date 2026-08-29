export type PickedFile = {
  uri: string;
  name: string;
  mimeType: string | null;
};

export type ProposedChapter = {
  id: string;
  title: string;
  content: string;
  orderIndex: number;
};

type DraftState = {
  file?: PickedFile;
  subjectName?: string;
  cleanedText?: string;
  chapters?: ProposedChapter[];
};

let draft: DraftState = {};

export function setPickedFile(file: PickedFile, subjectName: string) {
  draft = { file, subjectName };
}

export function getPickedFile(): PickedFile | undefined {
  return draft.file;
}

export function getSubjectName(): string | undefined {
  return draft.subjectName;
}

export function setCleanedText(text: string) {
  draft.cleanedText = text;
}

export function getCleanedText(): string | undefined {
  return draft.cleanedText;
}

export function setProposedChapters(chapters: ProposedChapter[]) {
  draft.chapters = chapters;
}

export function getProposedChapters(): ProposedChapter[] | undefined {
  return draft.chapters;
}

export function clearDraft() {
  draft = {};
}
