import { BadGatewayException, HttpException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { z } from "zod";

import type { SearchContextSchema } from "./dto/search-context.dto";
import type { SearchContextResultSchema, SearchSourceSchema } from "./dto/search-response.dto";
import { BraveContextResponseSchema } from "./schemas/brave-context.schema";

export type LlmContextOptions = z.output<typeof SearchContextSchema>;
export type LlmContextSource = z.output<typeof SearchSourceSchema>;
export type LlmContextResult = z.output<typeof SearchContextResultSchema>;

@Injectable()
export class BraveLlmContextClient {
  constructor(private readonly config: ConfigService) {}

  async retrieve(options: LlmContextOptions): Promise<LlmContextResult> {
    const count = options.count ?? 10;
    const url = new URL("https://api.search.brave.com/res/v1/llm/context");
    url.searchParams.set("q", options.query);
    url.searchParams.set("count", String(count));
    url.searchParams.set("maximum_number_of_urls", String(count));
    url.searchParams.set("maximum_number_of_tokens", String(options.maximumTokens ?? 4096));
    url.searchParams.set("maximum_number_of_tokens_per_url", "1024");
    url.searchParams.set("context_threshold_mode", "balanced");
    url.searchParams.set("safesearch", options.safesearch ?? "moderate");
    url.searchParams.set("spellcheck", "true");
    url.searchParams.set("enable_source_metadata", "true");
    if (options.country) url.searchParams.set("country", options.country);
    if (options.searchLang) url.searchParams.set("search_lang", options.searchLang);
    if (options.freshness) url.searchParams.set("freshness", options.freshness);

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": this.config.getOrThrow("BRAVE_SEARCH_API_KEY"),
        },
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        throw new BadGatewayException(`Brave returned ${response.status}`);
      }

      const parsed = BraveContextResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        throw new BadGatewayException("Brave LLM Context returned an invalid response");
      }
      const body = parsed.data;
      const sources: LlmContextSource[] = (body.grounding?.generic ?? []).flatMap((item, index) => {
        if (!item.url) return [];

        const metadata = body.sources?.[item.url];
        const title = item.title ?? metadata?.title;

        const snippets = (item.snippets ?? []).filter(
          (snippet): snippet is string => typeof snippet === "string" && snippet.length > 0,
        );
        if (snippets.length === 0 && metadata?.snippet) {
          snippets.push(metadata.snippet);
        }
        if (!title || snippets.length === 0) return [];

        return [
          {
            citation: index + 1,
            title,
            url: item.url,
            snippets,
            ...(metadata?.hostname ? { hostname: metadata.hostname } : {}),
            ...(metadata?.site_name ? { siteName: metadata.site_name } : {}),
            ...(metadata?.age?.[3] ? { publishedAt: metadata.age[3] } : {}),
          },
        ];
      });

      return { query: options.query, sources };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadGatewayException("Brave LLM Context is unavailable", { cause: error as Error });
    }
  }
}
