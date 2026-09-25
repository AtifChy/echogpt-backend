import { Anthropic } from "@anthropic-ai/sdk";
import { Injectable } from "@nestjs/common";

import type { ProviderAdapter, ProviderPrompt, ProviderResponse } from "./provider.interface";

@Injectable()
export class AnthropicProvider implements ProviderAdapter {
  readonly type = "ANTHROPIC" as const;

  async generate(input: ProviderPrompt): Promise<ProviderResponse> {
    const client = new Anthropic({ apiKey: input.apiKey });
    const response = await client.messages.create({
      model: input.model,
      max_tokens: 4096,
      messages: [{ role: "user", content: input.prompt }],
    });

    const content = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    return {
      content,
      inputTokens: response.usage.input_tokens ?? 0,
      outputTokens: response.usage.output_tokens ?? 0,
    };
  }
}
