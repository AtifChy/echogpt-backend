import { BadGatewayException, HttpException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface BraveContextResponse {
  grounding?: {
    generic?: Array<{
      url?: string;
      title?: string;
      snippets?: string[];
    }>;
  };
  sources?: Record<
    string,
    {
      title?: string;
      hostname?: string;
      age?: string[];
      snippet?: string;
      site_name?: string;
    }
  >;
}

export interface LlmContextOptions {
  query: string;
  country?: string;
  searchLang?: string;
  count?: number;
  maximumTokens?: number;
  safesearch?: "off" | "moderate" | "strict";
  freshness?: string;
}

export interface LlmContextSource {
  citation: number;
  title: string;
  url: string;
  snippets: string[];
  hostname?: string;
  siteName?: string;
  publishedAt?: string;
}

export interface LlmContextResult {
  query: string;
  sources: LlmContextSource[];
}

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

      const body = (await response.json()) as BraveContextResponse;
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
