import { GoogleGenAI } from "@google/genai";
import { Injectable } from "@nestjs/common";

import type { ProviderAdapter, ProviderPrompt, ProviderResponse } from "./provider.interface";

@Injectable()
export class GeminiProvider implements ProviderAdapter {
  readonly type = "GEMINI" as const;

  async generate(input: ProviderPrompt): Promise<ProviderResponse> {
    const client = new GoogleGenAI({ apiKey: input.apiKey });
    const response = await client.models.generateContent({
      model: input.model,
      contents: input.prompt,
    });

    return {
      content: response.text ?? "",
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }
}
