import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "bun:test";
import { randomUUID } from "node:crypto";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../../src/app.module";
import { configureApp } from "../../src/configure-app";
import { PrismaService } from "../../src/prisma.service";
import { OpenAiProvider } from "../../src/providers/openai.provider";
import { ProvidersService } from "../../src/providers/providers.service";
import {
  BraveLlmContextClient,
  type LlmContextResult,
} from "../../src/search/brave-llm-context.client";

const referenceContext: LlmContextResult = {
  query: "citation persistence",
  // Deliberately out of order, with a gap: history must sort without renumbering.
  sources: [
    {
      citation: 3,
      title: "Second reference",
      url: "https://second.example.invalid/docs",
      snippets: ["External text for the mocked model."],
    },
    {
      citation: 1,
      title: "First reference",
      url: "https://first.example.invalid/docs",
      hostname: "first.example.invalid",
      publishedAt: "2026-01-01",
      snippets: ["Another external reference."],
    },
  ],
};

function expectedSources(context: LlmContextResult) {
  return context.sources.map((source) => ({
    citation: source.citation,
    title: source.title,
    url: source.url,
    hostname: source.hostname ?? null,
    publishedAt: source.publishedAt ?? null,
  }));
}

describe("Chat citations API (test database, mocked external services)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken = "";
  let otherToken = "";
  let userId = 0;
  let providerId = 0;
  const runId = randomUUID();
  const emails = [`chat-sources-${runId}@example.com`, `chat-outsider-${runId}@example.com`];
  const generate = vi.fn<OpenAiProvider["generate"]>();
  const retrieve = vi.fn<BraveLlmContextClient["retrieve"]>();

  beforeAll(async () => {
    // Override the actual network boundaries; auth, chat, search and Prisma remain real.
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(OpenAiProvider)
      .useValue({ type: "OPENAI", generate })
      .overrideProvider(BraveLlmContextClient)
      .useValue({ retrieve })
      .compile();
    app = module.createNestApplication();
    app.useLogger(false);
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    // Fail before writing fixtures if the separate test database lacks the new table.
    try {
      await prisma.db.orm.public.MessageSource.select("id").limit(1).all();
    } catch (error) {
      throw new Error(
        "Chat source tests require the current test schema. Run bun run db:test:update for echogpt_test.",
        { cause: error },
      );
    }

    for (const [index, email] of emails.entries()) {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send({ email, password: "citation-test-password", displayName: "Chat citation test" })
        .expect(201);
      if (index === 0) {
        accessToken = response.body.accessToken;
        userId = response.body.user.id;
      } else otherToken = response.body.accessToken;
    }
    const provider = await app.get(ProvidersService).create({
      name: `Citation test ${runId}`,
      type: "OPENAI",
      model: "mocked-model",
      apiKey: "dummy-test-key-never-sent",
      enabled: true,
    });
    providerId = provider.id;
  });

  beforeEach(() => {
    generate
      .mockReset()
      .mockResolvedValue({ content: "A saved answer [1] [3].", inputTokens: 3, outputTokens: 5 });
    retrieve.mockReset().mockResolvedValue(referenceContext);
  });

  afterAll(async () => {
    if (!app) return;
    try {
      if (prisma) {
        // Exact randomly named test accounts only; their dependent rows cascade.
        for (const email of emails) await prisma.db.orm.public.User.where({ email }).delete();
        if (providerId) await prisma.db.orm.public.AiProvider.where({ id: providerId }).delete();
      }
    } finally {
      await app.close();
    }
  });

  async function createConversation() {
    const response = await request(app.getHttpServer())
      .post("/api/v1/conversations")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ providerId })
      .expect(201);
    return response.body.id as number;
  }

  function send(conversationId: number, webSearch = true) {
    return request(app.getHttpServer())
      .post("/api/v1/chat/messages")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ conversationId, prompt: "Save this response", webSearch });
  }

  function history(conversationId: number, token = accessToken) {
    return request(app.getHttpServer())
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${token}`);
  }

  it("requires authentication for sending and retrieving messages", async () => {
    const id = await createConversation();
    await request(app.getHttpServer())
      .post("/api/v1/chat/messages")
      .send({ conversationId: id, prompt: "hello", webSearch: true })
      .expect(401);
    await request(app.getHttpServer()).get(`/api/v1/conversations/${id}/messages`).expect(401);
    expect(generate).not.toHaveBeenCalled();
    expect(retrieve).not.toHaveBeenCalled();
  });

  it("returns citations only inside message and saves source rows without snippets", async () => {
    const id = await createConversation();
    const response = await send(id).expect(201);
    expect(Object.keys(response.body)).toEqual(["message"]);
    expect(response.body.message.sources).toEqual(expectedSources(referenceContext));
    const stored = await prisma.db.orm.public.MessageSource.where({
      messageId: response.body.message.id,
    })
      .select("citation", "title", "url", "hostname", "publishedAt")
      .orderBy((source) => source.citation.asc())
      .all();
    expect(stored).toEqual(
      expectedSources(referenceContext).sort((a, b) => a.citation - b.citation),
    );
    expect(response.body.message.sources[0]).not.toHaveProperty("snippets");
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "mocked-model",
        prompt: expect.stringContaining("<web_references>"),
      }),
    );
  });

  it("returns persisted citations on repeated history requests without new external calls", async () => {
    const id = await createConversation();
    const sent = await send(id).expect(201);
    const expected = expectedSources(referenceContext).sort((a, b) => a.citation - b.citation);
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await history(id).expect(200);
      expect(response.body.map((message: { role: string }) => message.role)).toEqual([
        "USER",
        "ASSISTANT",
      ]);
      expect(response.body[0].sources).toEqual([]);
      expect(response.body[1]).toMatchObject({ id: sent.body.message.id, sources: expected });
      expect(response.body[1].sources[0]).not.toHaveProperty("messageId");
      expect(response.body[1].sources[0]).not.toHaveProperty("id");
    }
    expect(generate).toHaveBeenCalledTimes(1);
    expect(retrieve).toHaveBeenCalledTimes(1);
  });

  it("returns empty sources for non-search answers and older source-free messages", async () => {
    const id = await createConversation();
    const sent = await send(id, false).expect(201);
    expect(sent.body.message.sources).toEqual([]);
    const legacy = await prisma.db.orm.public.Message.create({
      conversationId: id,
      role: "ASSISTANT",
      content: "Older answer",
      inputTokens: 0,
      outputTokens: 0,
    });
    const response = await history(id).expect(200);
    expect(
      response.body.find((message: { id: number }) => message.id === legacy.id).sources,
    ).toEqual([]);
    expect(retrieve).not.toHaveBeenCalled();
  });

  it("does not expose another user's conversation or write messages to it", async () => {
    const id = await createConversation();
    await send(id).expect(201);
    await history(id, otherToken).expect(404);
    await request(app.getHttpServer())
      .post("/api/v1/chat/messages")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ conversationId: id, prompt: "Not my conversation", webSearch: true })
      .expect(404);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(retrieve).toHaveBeenCalledTimes(1);
    expect((await history(id).expect(200)).body).toHaveLength(2);
  });

  it("keeps citation snapshots after the owner clears search history", async () => {
    const id = await createConversation();
    const sent = await send(id).expect(201);
    // Create a second row explicitly so this catches partial clears even in isolation.
    await prisma.db.orm.public.WebSearch.create({
      userId,
      query: "Another citation test search",
      normalizedQuery: "another citation test search",
    });
    expect((await prisma.db.orm.public.WebSearch.where({ userId }).all()).length).toBeGreaterThan(
      1,
    );
    await request(app.getHttpServer())
      .delete("/api/v1/search/history")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(204);
    const response = await history(id).expect(200);
    expect(
      response.body.find((message: { id: number }) => message.id === sent.body.message.id).sources,
    ).toHaveLength(2);
    expect(retrieve).toHaveBeenCalledTimes(1);
    expect(await prisma.db.orm.public.WebSearch.where({ userId }).all()).toEqual([]);
  });

  it("cascades citation deletion when the owner removes the conversation", async () => {
    const id = await createConversation();
    const sent = await send(id).expect(201);
    await request(app.getHttpServer())
      .delete(`/api/v1/conversations/${id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(204);
    expect(await prisma.db.orm.public.Message.where({ conversationId: id }).all()).toEqual([]);
    expect(
      await prisma.db.orm.public.MessageSource.where({ messageId: sent.body.message.id }).all(),
    ).toEqual([]);
    await history(id).expect(404);
  });

  it("rolls back the assistant, earlier source inserts and SUCCESS log if a citation insert fails", async () => {
    const id = await createConversation();
    const rollbackUrl = `https://rollback.example.invalid/${runId}/${id}`;
    retrieve.mockResolvedValue({
      query: "rollback",
      sources: [
        { citation: 1, title: "First insert", url: rollbackUrl, snippets: ["first"] },
        {
          citation: 1,
          title: "Duplicate citation",
          url: `${rollbackUrl}/duplicate`,
          snippets: ["second"],
        },
      ],
    });
    const successesBefore = await prisma.db.orm.public.ApiUsageLog.where({
      userId,
      operation: "CHAT",
      status: "SUCCESS",
    }).all();
    await send(id).expect(500);
    const response = await history(id).expect(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ role: "USER", sources: [] });
    expect(await prisma.db.orm.public.MessageSource.where({ url: rollbackUrl }).all()).toEqual([]);
    expect(
      await prisma.db.orm.public.ApiUsageLog.where({
        userId,
        operation: "CHAT",
        status: "SUCCESS",
      }).all(),
    ).toHaveLength(successesBefore.length);
    expect(
      await prisma.db.orm.public.ApiUsageLog.where({
        userId,
        operation: "CHAT",
        status: "FAILED",
      }).all(),
    ).not.toHaveLength(0);
  });
});
