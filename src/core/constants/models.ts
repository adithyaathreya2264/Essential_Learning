export type ModelId = 'E2B' | 'E4B' | 'QWEN3_0_6B';

export type ModelDefinition = {
  id: ModelId;
  label: string;
  url: string;
  sizeBytes: number;
  sha256: string;
  recommendedMinRamGB: number;
};

export const MODELS: Record<ModelId, ModelDefinition> = {
  E2B: {
    id: 'E2B',
    label: 'Gemma E2B',
    url: 'https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it.litertlm',
    sizeBytes: 2_588_147_712,
    sha256: '181938105e0eefd105961417e8da75903eacda102c4fce9ce90f50b97139a63c',
    recommendedMinRamGB: 0,
  },
  E4B: {
    id: 'E4B',
    label: 'Gemma E4B',
    url: 'https://huggingface.co/litert-community/gemma-4-E4B-it-litert-lm/resolve/main/gemma-4-E4B-it.litertlm',
    sizeBytes: 3_659_530_240,
    sha256: '0b2a8980ce155fd97673d8e820b4d29d9c7d99b8fa6806f425d969b145bd52e0',
    recommendedMinRamGB: 6,
  },
  QWEN3_0_6B: {
    id: 'QWEN3_0_6B',
    label: 'Qwen3 0.6B',
    url: 'https://huggingface.co/litert-community/Qwen3-0.6B/resolve/main/Qwen3-0.6B.litertlm',
    sizeBytes: 614_236_160,
    sha256: '555579ff2f4fd13379abe69c1c3ab5200f7338bc92471557f1d6614a6e5ab0b4',
    recommendedMinRamGB: 0,
  },
};

export function getModel(id: ModelId): ModelDefinition {
  return MODELS[id];
}
