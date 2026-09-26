import { BadGatewayException } from "@nestjs/common";

import { BraveLlmContextClient } from "../../src/search/brave-llm-context.client";
import { SearchService } from "../../src/search/search.service";

afterEach(() => vi.unstubAllGlobals());

describe("BraveLlmContextClient", () => {
  const config = { getOrThrow: vi.fn().mockReturnValue("test-brave-key-never-sent") };

  it("maps grounding and source metadata", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
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
    });
    vi.stubGlobal("fetch", fetchMock);
    const client = new BraveLlmContextClient(config as never);

    await expect(
      client.retrieve({ query: "NestJS docs", country: "BD", count: 20 }),
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
  });

  it("converts non-2xx and network failures to 502", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 422 }));
    const client = new BraveLlmContextClient(config as never);
    await expect(client.retrieve({ query: "NestJS" })).rejects.toBeInstanceOf(BadGatewayException);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("socket failed")));
    await expect(client.retrieve({ query: "NestJS" })).rejects.toMatchObject({
      message: "Brave LLM Context is unavailable",
    });
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

describe("SearchService", () => {
  it("checks quota, normalizes a query, and logs success", async () => {
    const f = serviceFixture();
    await expect(f.service.search(5, { query: "  NestJS   Docs  " })).resolves.toMatchObject({
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
    await expect(f.service.search(5, { query: "x" })).rejects.toBeInstanceOf(BadGatewayException);
    expect(f.failureCreate).toHaveBeenCalledWith(
      expect.objectContaining({ operation: "SEARCH", status: "FAILED" }),
    );
  });
});
