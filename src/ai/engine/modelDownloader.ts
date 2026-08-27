import { AppState } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { getModel, ModelId } from '../../core/constants/models';
import { hasEnoughStorage } from '../../core/utils/deviceCapability';
import { verifyDownloadedFile } from '../../core/utils/checksums';
import {
  getModelInstall,
  listModelInstalls,
  ModelInstall,
  upsertModelInstall,
} from '../../data/repositories/modelRepository';

export type DownloadListener = (install: ModelInstall) => void;

const listeners = new Set<DownloadListener>();
const activeTasks = new Map<ModelId, FileSystemLegacy.DownloadResumable>();
const lastPersistAt = new Map<ModelId, number>();

const PROGRESS_PERSIST_THROTTLE_MS = 1000;

export function subscribeToModelDownload(listener: DownloadListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(install: ModelInstall) {
  listeners.forEach((listener) => listener(install));
}

function getModelsDirectory(): Directory {
  const dir = new Directory(Paths.document, 'models');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function getLocalPath(modelId: ModelId): string {
  return new File(getModelsDirectory(), `${modelId}.litertlm`).uri;
}

async function persist(
  modelId: ModelId,
  status: ModelInstall['status'],
  bytesDownloaded: number,
  totalBytes: number,
  resumeData: string | null,
  localPath: string | null
) {
  const install = { modelId, status, bytesDownloaded, totalBytes, resumeData, localPath };
  await upsertModelInstall(install);
  notify({ ...install, updatedAt: Date.now() });
}

export type StartDownloadResult = { ok: true } | { ok: false; reason: 'insufficient-storage' };

export async function startModelDownload(modelId: ModelId): Promise<StartDownloadResult> {
  if (activeTasks.has(modelId)) return { ok: true };

  const model = getModel(modelId);
  const localPath = getLocalPath(modelId);
  const existing = await getModelInstall(modelId);

  // Never re-download a model that is already complete on disk — these files are
  // multi-gigabyte, so a redundant fetch is an expensive mistake, not a no-op.
  if (existing?.status === 'verified') return { ok: true };
  const preflight = await verifyDownloadedFile(localPath, model.sizeBytes, 'size');
  if (preflight.valid) {
    await persist(modelId, 'verified', model.sizeBytes, model.sizeBytes, null, localPath);
    return { ok: true };
  }

  // Checked before touching the network or persisted status at all — starting a
  // multi-gigabyte download that's doomed to fill the disk and die partway
  // through is a worse experience than an honest upfront refusal.
  if (!hasEnoughStorage(modelId)) {
    return { ok: false, reason: 'insufficient-storage' };
  }

  const onProgress = (data: FileSystemLegacy.DownloadProgressData) => {
    const now = Date.now();
    const last = lastPersistAt.get(modelId) ?? 0;
    if (now - last < PROGRESS_PERSIST_THROTTLE_MS) return;
    lastPersistAt.set(modelId, now);
    persist(modelId, 'downloading', data.totalBytesWritten, data.totalBytesExpectedToWrite, null, localPath);
  };

  const canResume = Boolean(existing?.resumeData);
  const task = canResume
    ? new FileSystemLegacy.DownloadResumable(model.url, localPath, {}, onProgress, existing!.resumeData!)
    : FileSystemLegacy.createDownloadResumable(model.url, localPath, {}, onProgress);

  activeTasks.set(modelId, task);
  await persist(modelId, 'downloading', existing?.bytesDownloaded ?? 0, model.sizeBytes, null, localPath);

  try {
    const result = canResume ? await task.resumeAsync() : await task.downloadAsync();
    activeTasks.delete(modelId);

    if (!result) return { ok: true }; // cancelled

    await persist(modelId, 'verifying', model.sizeBytes, model.sizeBytes, null, localPath);
    const verification = await verifyDownloadedFile(localPath, model.sizeBytes, 'size');

    if (verification.valid) {
      await persist(modelId, 'verified', model.sizeBytes, model.sizeBytes, null, localPath);
    } else {
      const file = new File(localPath);
      if (file.exists) file.delete();
      await persist(modelId, 'failed', 0, model.sizeBytes, null, null);
    }
  } catch {
    activeTasks.delete(modelId);
    const latest = await getModelInstall(modelId);
    await persist(
      modelId,
      'failed',
      latest?.bytesDownloaded ?? 0,
      model.sizeBytes,
      latest?.resumeData ?? null,
      localPath
    );
  }

  return { ok: true };
}

export function isDownloadActive(modelId: ModelId): boolean {
  return activeTasks.has(modelId);
}

export async function cancelModelDownload(modelId: ModelId): Promise<void> {
  const task = activeTasks.get(modelId);
  if (task) {
    await task.cancelAsync();
    activeTasks.delete(modelId);
  }
  const localPath = getLocalPath(modelId);
  const file = new File(localPath);
  if (file.exists) file.delete();
  await persist(modelId, 'idle', 0, 0, null, null);
}

/**
 * Reconciles persisted install state against what is actually on disk.
 *
 * The DB row and the filesystem can drift: a download can complete and be
 * verified, then a later interrupted/paused attempt overwrites the row with a
 * non-verified status even though the on-disk file is still complete and
 * correct. Trusting the row alone would strand a perfectly good model as
 * unusable, so on startup the file itself is the source of truth.
 *
 * Runs once at app start, before any UI reads install state.
 */
export async function reconcileModelInstalls(): Promise<void> {
  const installs = await listModelInstalls();

  for (const install of installs) {
    if (install.status === 'downloading' || install.status === 'verifying') {
      // No task can be in-flight this early in startup — the process just began.
      // Leave the bytes/resumeData intact so the user can resume.
      await persist(
        install.modelId,
        'paused',
        install.bytesDownloaded,
        install.totalBytes,
        install.resumeData,
        install.localPath
      );
      continue;
    }

    if (install.status === 'verified') continue;

    // 'paused' or 'failed': the file may still be complete and valid.
    const model = getModel(install.modelId);
    const localPath = install.localPath ?? getLocalPath(install.modelId);
    const verification = await verifyDownloadedFile(localPath, model.sizeBytes, 'size');

    if (verification.valid) {
      await persist(install.modelId, 'verified', model.sizeBytes, model.sizeBytes, null, localPath);
    }
  }
}

// Gracefully pause any active download when the app backgrounds, so a
// resumeData token exists even if the OS kills the process while backgrounded —
// createDownloadResumable only produces resumeData via an explicit pauseAsync().
// A pause is NOT a failure: it keeps its own status so it never clobbers a
// previously verified install or surfaces an alarming error to the user.
AppState.addEventListener('change', (state) => {
  if (state !== 'background') return;
  activeTasks.forEach((task, modelId) => {
    task
      .pauseAsync()
      .then(async (pauseState) => {
        activeTasks.delete(modelId);
        const existing = await getModelInstall(modelId);
        await persist(
          modelId,
          'paused',
          existing?.bytesDownloaded ?? 0,
          existing?.totalBytes ?? 0,
          pauseState.resumeData ?? null,
          existing?.localPath ?? null
        );
      })
      .catch(() => {
        activeTasks.delete(modelId);
      });
  });
});
