import type { Models } from "../prisma/contract";

export interface ProviderPrompt {
  apiKey: string;
  model: string;
  prompt: string;
}

export interface ProviderResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

type ProviderType = Models.public_AiProvider["type"];

export interface ProviderAdapter {
  readonly type: ProviderType;
  generate(input: ProviderPrompt): Promise<ProviderResponse>;
}
