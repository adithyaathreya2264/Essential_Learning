import { useCallback, useEffect, useState } from 'react';
import { ModelId } from '../core/constants/models';
import {
  cancelModelDownload,
  isDownloadActive,
  startModelDownload,
  subscribeToModelDownload,
} from '../ai/engine/modelDownloader';
import {
  getActiveModelInstall,
  getModelInstall,
  ModelInstall,
  ModelInstallStatus,
} from '../data/repositories/modelRepository';

export type UseModelResult = {
  status: ModelInstallStatus;
  bytesDownloaded: number;
  totalBytes: number;
  error: boolean;
  /** True when the last start/retry was refused upfront for lack of free disk space — distinct from a network `error`. */
  insufficientStorage: boolean;
  start: () => void;
  retry: () => void;
  cancel: () => void;
};

export function useModel(modelId: ModelId): UseModelResult {
  const [install, setInstall] = useState<ModelInstall | null>(null);
  const [insufficientStorage, setInsufficientStorage] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getModelInstall(modelId).then((row) => {
      if (cancelled) return;
      setInstall(row);
      if ((row?.status === 'downloading' || row?.status === 'paused') && !isDownloadActive(modelId)) {
        startModelDownload(modelId);
      }
    });

    const unsubscribe = subscribeToModelDownload((update) => {
      if (update.modelId === modelId) setInstall(update);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [modelId]);

  const start = useCallback(() => {
    setInsufficientStorage(false);
    startModelDownload(modelId).then((result) => {
      if (!result.ok) setInsufficientStorage(true);
    });
  }, [modelId]);

  const cancel = useCallback(() => {
    cancelModelDownload(modelId);
  }, [modelId]);

  return {
    status: install?.status ?? 'idle',
    bytesDownloaded: install?.bytesDownloaded ?? 0,
    totalBytes: install?.totalBytes ?? 0,
    error: install?.status === 'failed',
    insufficientStorage,
    start,
    retry: start,
    cancel,
  };
}

export type UseActiveModelResult = UseModelResult & { modelId: ModelId | null };

/**
 * Tracks whichever model install is currently most relevant (in-progress/failed
 * takes priority over an already-verified one) without the caller needing to
 * know the modelId up front — used by screens like Home that just want "the"
 * current download state.
 */
export function useActiveModel(): UseActiveModelResult {
  const [install, setInstall] = useState<ModelInstall | null>(null);
  const [insufficientStorage, setInsufficientStorage] = useState(false);

  const refresh = useCallback(() => {
    getActiveModelInstall().then((row) => {
      setInstall(row);
      if ((row?.status === 'downloading' || row?.status === 'paused') && !isDownloadActive(row.modelId)) {
        startModelDownload(row.modelId);
      }
    });
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeToModelDownload(() => refresh());
    return unsubscribe;
  }, [refresh]);

  const modelId = install?.modelId ?? null;

  const start = useCallback(() => {
    if (!modelId) return;
    setInsufficientStorage(false);
    startModelDownload(modelId).then((result) => {
      if (!result.ok) setInsufficientStorage(true);
    });
  }, [modelId]);

  const cancel = useCallback(() => {
    if (modelId) cancelModelDownload(modelId);
  }, [modelId]);

  return {
    modelId,
    status: install?.status ?? 'idle',
    bytesDownloaded: install?.bytesDownloaded ?? 0,
    totalBytes: install?.totalBytes ?? 0,
    error: install?.status === 'failed',
    insufficientStorage,
    start,
    retry: start,
    cancel,
  };
}
