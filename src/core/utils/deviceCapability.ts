import * as Device from 'expo-device';
import { Paths } from 'expo-file-system';
import { ModelId, MODELS } from '../constants/models';

const BYTES_PER_GB = 1024 * 1024 * 1024;

export function getTotalRamGB(): number | null {
  const totalMemory = Device.totalMemory;
  if (totalMemory == null) return null;
  return totalMemory / BYTES_PER_GB;
}

export function recommendModel(): ModelId {
  const ramGB = getTotalRamGB();
  if (ramGB != null && ramGB >= MODELS.E4B.recommendedMinRamGB) {
    return 'E4B';
  }
  return 'E2B';
}

export function hasEnoughStorage(modelId: ModelId): boolean {
  const model = MODELS[modelId];
  const available = Paths.availableDiskSpace;
  return available >= model.sizeBytes;
}
