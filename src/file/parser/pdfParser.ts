import { extractTextWithInfo, isAvailable, isPasswordProtected } from 'expo-pdf-text-extract';

export type PdfExtractionResult =
  | { status: 'success'; text: string; pageCount: number }
  | { status: 'password-required' }
  | { status: 'incorrect-password' }
  | { status: 'corrupt' }
  | { status: 'scanned-or-empty' }
  | { status: 'unavailable' };

export function isPdfExtractionAvailable(): boolean {
  return isAvailable();
}

export async function checkPdfPasswordProtected(uri: string): Promise<boolean> {
  return isPasswordProtected(uri);
}

export async function extractPdfText(uri: string, password?: string): Promise<PdfExtractionResult> {
  if (!isAvailable()) {
    return { status: 'unavailable' };
  }

  const result = await extractTextWithInfo(uri, password);

  if (result.errorCode === 'PASSWORD_REQUIRED') {
    return { status: 'password-required' };
  }
  if (result.errorCode === 'INCORRECT_PASSWORD') {
    return { status: 'incorrect-password' };
  }
  if (!result.success || result.errorCode === 'CORRUPT_PDF' || result.errorCode === 'FILE_NOT_FOUND') {
    return { status: 'corrupt' };
  }
  if (result.text.trim().length === 0) {
    return { status: 'scanned-or-empty' };
  }

  return { status: 'success', text: result.text, pageCount: result.pageCount };
}
