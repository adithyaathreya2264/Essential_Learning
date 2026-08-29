import { File } from 'expo-file-system';

export type VerifyMode = 'size' | 'sha256';

export type VerifyResult = { valid: boolean; actualSizeBytes: number };

/**
 * Verifies a downloaded model file. Only 'size' mode is implemented for now —
 * a real chunked SHA256 (via File.open()/FileHandle.readBytes() + js-sha256's
 * incremental update()) is deferred; the sha256 values are already captured
 * in the model registry for when that lands.
 */
export async function verifyDownloadedFile(
  localPath: string,
  expectedSizeBytes: number,
  mode: VerifyMode = 'size'
): Promise<VerifyResult> {
  if (mode === 'sha256') {
    throw new Error('sha256 verification is not implemented yet; use mode "size"');
  }

  const file = new File(localPath);
  const info = file.info();
  const actualSizeBytes = info.size ?? 0;

  return { valid: info.exists && actualSizeBytes === expectedSizeBytes, actualSizeBytes };
}
