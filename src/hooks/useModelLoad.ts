import { useCallback, useEffect, useState } from 'react';
import { getLoadedModel, isModelLoaded, ModelLoadError } from '../ai/engine/modelManager';

export type ModelLoadStatus = 'idle' | 'loading' | 'ready' | 'failed';

export type UseModelLoadResult = {
  status: ModelLoadStatus;
  errorMessage: string | null;
  retry: () => void;
};

/**
 * A verified (downloaded) model isn't necessarily a loadable one — memory
 * pressure can reject every step in CONTEXT_TOKEN_STEPS. This eagerly attempts
 * the load once the download is verified, so a load failure surfaces on Home
 * as its own honest state instead of only appearing the first time the
 * student tries to chat.
 */
export function useModelLoad(enabled: boolean): UseModelLoadResult {
  const [status, setStatus] = useState<ModelLoadStatus>(isModelLoaded() ? 'ready' : 'idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const attempt = useCallback(() => {
    if (isModelLoaded()) {
      setStatus('ready');
      return;
    }
    setStatus('loading');
    setErrorMessage(null);
    getLoadedModel()
      .then(() => setStatus('ready'))
      .catch((error) => {
        setStatus('failed');
        setErrorMessage(
          error instanceof ModelLoadError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'The AI failed to load.'
        );
      });
  }, []);

  useEffect(() => {
    if (enabled) attempt();
  }, [enabled, attempt]);

  return { status, errorMessage, retry: attempt };
}
