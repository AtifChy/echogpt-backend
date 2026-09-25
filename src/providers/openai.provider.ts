import { Injectable } from "@nestjs/common";
import { OpenAI } from "openai";

import type { ProviderAdapter, ProviderPrompt, ProviderResponse } from "./provider.interface";

@Injectable()
export class OpenAiProvider implements ProviderAdapter {
  readonly type = "OPENAI" as const;

  async generate(input: ProviderPrompt): Promise<ProviderResponse> {
    const client = new OpenAI({ apiKey: input.apiKey });
    const response = await client.responses.create({
      model: input.model,
      input: input.prompt,
    });

    return {
      content: response.output_text,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    };
  }
}
