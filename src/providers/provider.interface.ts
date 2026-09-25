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

export interface ProviderAdapter {
  readonly type: "OPENAI" | "ANTHROPIC" | "GEMINI";
  generate(input: ProviderPrompt): Promise<ProviderResponse>;
}
