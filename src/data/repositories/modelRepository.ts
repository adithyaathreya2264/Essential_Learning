import { File } from 'expo-file-system';
import { ModelId } from '../../core/constants/models';
import { getDb } from '../db/client';

export type ModelInstallStatus = 'idle' | 'downloading' | 'paused' | 'verifying' | 'verified' | 'failed';

export type ModelInstall = {
  modelId: ModelId;
  status: ModelInstallStatus;
  bytesDownloaded: number;
  totalBytes: number;
  resumeData: string | null;
  localPath: string | null;
  updatedAt: number;
};

export async function getModelInstall(modelId: ModelId): Promise<ModelInstall | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ModelInstall>('SELECT * FROM ModelInstall WHERE modelId = ?', [modelId]);
  return row ?? null;
}

export async function listModelInstalls(): Promise<ModelInstall[]> {
  const db = await getDb();
  return db.getAllAsync<ModelInstall>('SELECT * FROM ModelInstall');
}

export async function getVerifiedModelInstall(): Promise<ModelInstall | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ModelInstall>("SELECT * FROM ModelInstall WHERE status = 'verified' LIMIT 1");
  return row ?? null;
}

/**
 * Returns whichever model install is currently most relevant to show the user:
 * an in-progress or failed one takes priority over an already-verified one.
 */
export async function getActiveModelInstall(): Promise<ModelInstall | null> {
  const db = await getDb();
  const inProgress = await db.getFirstAsync<ModelInstall>(
    "SELECT * FROM ModelInstall WHERE status IN ('downloading', 'paused', 'verifying', 'failed') ORDER BY updatedAt DESC LIMIT 1"
  );
  if (inProgress) return inProgress;
  return getVerifiedModelInstall();
}

export async function upsertModelInstall(install: Omit<ModelInstall, 'updatedAt'>): Promise<void> {
  const db = await getDb();
  const updatedAt = Date.now();
  await db.runAsync(
    `INSERT INTO ModelInstall (modelId, status, bytesDownloaded, totalBytes, resumeData, localPath, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(modelId) DO UPDATE SET
       status = excluded.status,
       bytesDownloaded = excluded.bytesDownloaded,
       totalBytes = excluded.totalBytes,
       resumeData = excluded.resumeData,
       localPath = excluded.localPath,
       updatedAt = excluded.updatedAt`,
    [
      install.modelId,
      install.status,
      install.bytesDownloaded,
      install.totalBytes,
      install.resumeData,
      install.localPath,
      updatedAt,
    ]
  );
}

export async function deleteModelInstall(modelId: ModelId): Promise<void> {
  const install = await getModelInstall(modelId);
  if (install?.localPath) {
    const file = new File(install.localPath);
    if (file.exists) {
      file.delete();
    }
  }
  const db = await getDb();
  await db.runAsync('DELETE FROM ModelInstall WHERE modelId = ?', [modelId]);
}
