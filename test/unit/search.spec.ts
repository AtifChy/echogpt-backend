import { describe, expect, it, vi } from "bun:test";

import { BadGatewayException } from "@nestjs/common";

import { BraveLlmContextClient } from "../../src/search/brave-llm-context.client";
import { SearchContextSchema } from "../../src/search/dto/search-context.dto";
import {
  SearchHistoryResponseDto,
  SearchHistoryResponseSchema,
  SearchResponseSchema,
  SuggestionsResponseDto,
  SuggestionsResponseSchema,
} from "../../src/search/dto/search-response.dto";
import { SearchService } from "../../src/search/search.service";

describe("BraveLlmContextClient", () => {
  const config = { getOrThrow: vi.fn().mockReturnValue("test-brave-key-never-sent") };

  it("maps grounding and source metadata", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        grounding: {
          generic: [
            {
              url: "https://docs.nestjs.com/",
              title: "NestJS Documentation",
              snippets: ["A progressive Node.js framework."],
            },
          ],
        },
        sources: {
          "https://docs.nestjs.com/": {
            hostname: "docs.nestjs.com",
            site_name: "NestJS",
            age: ["", "", "", "2026-09-01T00:00:00.000Z"],
          },
        },
      }),
    );
    const client = new BraveLlmContextClient(config as never);

    await expect(
      client.retrieve({
        query: "NestJS docs",
        country: "BD",
        count: 20,
        searchLang: "en",
        maximumTokens: 8192,
        safesearch: "strict",
        freshness: "pw",
      }),
    ).resolves.toEqual({
      query: "NestJS docs",
      sources: [
        {
          citation: 1,
          title: "NestJS Documentation",
          url: "https://docs.nestjs.com/",
          snippets: ["A progressive Node.js framework."],
          hostname: "docs.nestjs.com",
          siteName: "NestJS",
          publishedAt: "2026-09-01T00:00:00.000Z",
        },
      ],
    });

    const url = fetchMock.mock.calls[0]?.[0] as URL;
    expect(url.searchParams.get("country")).toBe("BD");
    expect(url.searchParams.get("maximum_number_of_urls")).toBe("20");
    expect(url.searchParams.get("search_lang")).toBe("en");
    expect(url.searchParams.get("maximum_number_of_tokens")).toBe("8192");
    expect(url.searchParams.get("safesearch")).toBe("strict");
    expect(url.searchParams.get("freshness")).toBe("pw");
  });

  it("converts non-2xx and network failures to 502", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 422 }));
    const client = new BraveLlmContextClient(config as never);
    await expect(client.retrieve({ query: "NestJS" })).rejects.toBeInstanceOf(BadGatewayException);

    fetchMock.mockRejectedValue(new Error("socket failed"));
    await expect(client.retrieve({ query: "NestJS" })).rejects.toMatchObject({
      message: "Brave LLM Context is unavailable",
    });
  });

  it("validates upstream shapes instead of trusting a type assertion", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const client = new BraveLlmContextClient(config as never);
    for (const payload of [
      null,
      [],
      { grounding: { generic: {} } },
      { grounding: { generic: [{ url: 42 }] } },
      { grounding: { generic: [{ snippets: "not-an-array" }] } },
      { sources: { "https://docs.nestjs.com/": { age: "invalid-age" } } },
    ]) {
      fetchMock.mockResolvedValueOnce(Response.json(payload));
      await expect(client.retrieve({ query: "NestJS" })).rejects.toMatchObject({
        message: "Brave LLM Context returned an invalid response",
      });
    }
  });

  it("preserves snippet filtering, metadata fallback, and optional fields", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        upstreamOnly: true,
        grounding: {
          generic: [
            { title: "No URL", snippets: ["skip"] },
            {
              url: "https://docs.nestjs.com/",
              snippets: [null, 42, "", "Docs"],
              upstreamOnly: true,
            },
            { url: "https://fallback.invalid/", title: "Fallback", snippets: [false, ""] },
            { url: "https://empty.invalid/", title: "Empty" },
          ],
        },
        sources: {
          "https://docs.nestjs.com/": {
            title: "NestJS",
            site_name: "NestJS",
            age: ["", "", "", "2 days ago"],
            upstreamOnly: true,
          },
          "https://fallback.invalid/": { snippet: "Fallback snippet" },
        },
      }),
    );
    const result = await new BraveLlmContextClient(config as never).retrieve({ query: "NestJS" });
    expect(result).toEqual({
      query: "NestJS",
      sources: [
        {
          citation: 2,
          title: "NestJS",
          url: "https://docs.nestjs.com/",
          snippets: ["Docs"],
          siteName: "NestJS",
          publishedAt: "2 days ago",
        },
        {
          citation: 3,
          title: "Fallback",
          url: "https://fallback.invalid/",
          snippets: ["Fallback snippet"],
        },
      ],
    });
    expect(SearchResponseSchema.safeParse({ ...result, searchId: 1 }).success).toBe(true);
  });

  it("accepts empty results and keeps the client's existing defaults", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({}));
    await expect(
      new BraveLlmContextClient(config as never).retrieve({ query: "NestJS" }),
    ).resolves.toEqual({ query: "NestJS", sources: [] });
    const url = fetchMock.mock.calls[0]?.[0] as URL;
    expect(url.searchParams.get("count")).toBe("10");
    expect(url.searchParams.get("maximum_number_of_tokens")).toBe("4096");
    expect(url.searchParams.get("safesearch")).toBe("moderate");
  });

  it("uses the same defaults for null search options", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({}));
    await new BraveLlmContextClient(config as never).retrieve(
      SearchContextSchema.parse({
        query: "NestJS",
        country: null,
        searchLang: null,
        count: null,
        maximumTokens: null,
        safesearch: null,
        freshness: null,
      }),
    );
    const url = fetchMock.mock.calls[0]?.[0] as URL;
    expect(url.searchParams.get("count")).toBe("10");
    expect(url.searchParams.get("maximum_number_of_tokens")).toBe("4096");
    expect(url.searchParams.get("safesearch")).toBe("moderate");
    expect(url.searchParams.has("country")).toBe(false);
    expect(url.searchParams.has("search_lang")).toBe(false);
    expect(url.searchParams.has("freshness")).toBe(false);
  });
});

describe("Search response DTOs", () => {
  it("uses the exported array schemas for history and suggestions", () => {
    expect(SearchHistoryResponseDto.schema).toBe(SearchHistoryResponseSchema);
    expect(SuggestionsResponseDto.schema).toBe(SuggestionsResponseSchema);
    const history = [
      {
        id: 1,
        query: "NestJS",
        createdAt: "2026-10-17 19:44:26.77117+00",
        userId: 10,
        normalizedQuery: "nestjs",
      },
    ];
    expect(SearchHistoryResponseSchema.parse(history)).toEqual([
      { id: 1, query: "NestJS", createdAt: history[0]!.createdAt },
    ]);
    expect(SearchHistoryResponseSchema.safeParse(history[0]).success).toBe(false);
    expect(SearchHistoryResponseSchema.safeParse([{ ...history[0], id: "1" }]).success).toBe(false);
    expect(SuggestionsResponseSchema.parse(["NestJS"])).toEqual(["NestJS"]);
    expect(SuggestionsResponseSchema.safeParse([1]).success).toBe(false);
    expect(SearchHistoryResponseSchema.parse([])).toEqual([]);
    expect(SuggestionsResponseSchema.parse([])).toEqual([]);
  });
});

function serviceFixture() {
  const successCreate = vi.fn().mockResolvedValue({ id: 20 });
  const failureCreate = vi.fn().mockResolvedValue({ id: 21 });
  const searchCreate = vi.fn().mockResolvedValue({ id: 12 });
  const tx = {
    orm: {
      public: {
        WebSearch: { create: searchCreate },
        ApiUsageLog: { create: successCreate },
      },
    },
  };
  const prisma = {
    db: {
      transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)),
      orm: { public: { ApiUsageLog: { create: failureCreate } } },
    },
  };
  const subscriptions = { assertAvailable: vi.fn().mockResolvedValue(undefined) };
  const brave = {
    retrieve: vi.fn().mockResolvedValue({ query: "  NestJS   Docs  ", sources: [] }),
  };
  return {
    service: new SearchService(prisma as never, subscriptions as never, brave as never),
    subscriptions,
    brave,
    searchCreate,
    successCreate,
    failureCreate,
  };
}

function searchInput(query: string) {
  return { ...SearchContextSchema.parse({ query }), query };
}

describe("SearchService", () => {
  it("checks quota, normalizes a query, and logs success", async () => {
    const f = serviceFixture();
    await expect(f.service.search(5, searchInput("  NestJS   Docs  "))).resolves.toMatchObject({
      searchId: 12,
    });
    expect(f.subscriptions.assertAvailable).toHaveBeenCalledWith(5);
    expect(f.searchCreate).toHaveBeenCalledWith({
      userId: 5,
      query: "  NestJS   Docs  ",
      normalizedQuery: "nestjs docs",
    });
    expect(f.successCreate).toHaveBeenCalledWith(
      expect.objectContaining({ operation: "SEARCH", status: "SUCCESS" }),
    );
  });

  it("logs failure when Brave fails", async () => {
    const f = serviceFixture();
    f.brave.retrieve.mockRejectedValue(new BadGatewayException("Brave failed"));
    await expect(f.service.search(5, searchInput("x"))).rejects.toBeInstanceOf(BadGatewayException);
    expect(f.failureCreate).toHaveBeenCalledWith(
      expect.objectContaining({ operation: "SEARCH", status: "FAILED" }),
    );
  });
});
