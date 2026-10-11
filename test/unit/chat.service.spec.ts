import { describe, expect, it, vi } from "bun:test";

import { NotFoundException } from "@nestjs/common";

import { ChatService } from "../../src/chat/chat.service";

function fixture(conversation: { id: number; userId: number; providerId: number } | null) {
  const first = vi.fn().mockResolvedValue(conversation);
  const assistantMessage = {
    id: 2,
    conversationId: 10,
    role: "ASSISTANT" as const,
    content: "answer",
    inputTokens: 3,
    outputTokens: 4,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  const historyMessage = {
    id: assistantMessage.id,
    role: assistantMessage.role,
    content: assistantMessage.content,
    inputTokens: assistantMessage.inputTokens,
    outputTokens: assistantMessage.outputTokens,
    createdAt: assistantMessage.createdAt,
    sources: [],
  };
  const sourceQuery = { select: vi.fn(), orderBy: vi.fn() };
  sourceQuery.select.mockReturnValue(sourceQuery);
  sourceQuery.orderBy.mockReturnValue(sourceQuery);
  const messageQuery = {
    select: vi.fn(),
    include: vi.fn(),
    orderBy: vi.fn(),
    all: vi.fn().mockResolvedValue([historyMessage]),
  };
  messageQuery.select.mockReturnValue(messageQuery);
  messageQuery.include.mockImplementation(
    (_name: string, callback: (query: typeof sourceQuery) => unknown) => {
      callback(sourceQuery);
      return messageQuery;
    },
  );
  messageQuery.orderBy.mockReturnValue(messageQuery);
  const messageWhere = vi.fn().mockReturnValue(messageQuery);
  const userMessageCreate = vi.fn().mockResolvedValue({ id: 1, role: "USER", content: "hello" });
  const assistantMessageCreate = vi.fn().mockResolvedValue(assistantMessage);
  const sourceCreate = vi.fn().mockResolvedValue({ id: 1 });
  const failedUsageCreate = vi.fn().mockResolvedValue({ id: 1 });
  const successUsageCreate = vi.fn().mockResolvedValue({ id: 2 });
  const tx = {
    orm: {
      public: {
        Message: { create: assistantMessageCreate },
        MessageSource: { create: sourceCreate },
        ApiUsageLog: { create: successUsageCreate },
      },
    },
  };
  const transaction = vi.fn(async (callback: (transactionClient: typeof tx) => Promise<unknown>) =>
    callback(tx),
  );
  const prisma = {
    db: {
      orm: {
        public: {
          Conversation: { where: vi.fn().mockReturnValue({ first }) },
          Message: { create: userMessageCreate, where: messageWhere },
          ApiUsageLog: { create: failedUsageCreate },
        },
      },
      transaction,
    },
  };
  const providers = {
    generate: vi.fn().mockResolvedValue({ content: "answer", inputTokens: 3, outputTokens: 4 }),
    resolveId: vi.fn(),
  };
  const subscriptions = { assertAvailable: vi.fn().mockResolvedValue(undefined) };
  const search = {
    retrieveForChat: vi.fn().mockResolvedValue({
      query: "hello",
      sources: [
        {
          citation: 1,
          title: "NestJS",
          url: "https://docs.nestjs.com/",
          snippets: ["NestJS documentation"],
          hostname: "docs.nestjs.com",
        },
      ],
    }),
  };
  return {
    service: new ChatService(
      prisma as never,
      providers as never,
      subscriptions as never,
      search as never,
    ),
    providers,
    assistantMessage,
    historyMessage,
    subscriptions,
    search,
    userMessageCreate,
    assistantMessageCreate,
    sourceCreate,
    failedUsageCreate,
    successUsageCreate,
    transaction,
    messageWhere,
    messageQuery,
    sourceQuery,
  };
}

describe("ChatService", () => {
  it("trims a prompt and logs successful token usage", async () => {
    const f = fixture({ id: 10, userId: 5, providerId: 4 });
    await expect(
      f.service.send(5, { conversationId: 10, prompt: "  hello  " }),
    ).resolves.toMatchObject({
      message: { role: "ASSISTANT", content: "answer", sources: [] },
    });
    expect(f.subscriptions.assertAvailable).toHaveBeenCalledWith(5, 1);
    expect(f.providers.generate).toHaveBeenCalledWith(4, "hello");
    expect(f.transaction).toHaveBeenCalledTimes(1);
    expect(f.userMessageCreate).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 10, role: "USER", content: "hello" }),
    );
    expect(f.assistantMessageCreate).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 10, role: "ASSISTANT", content: "answer" }),
    );
    expect(f.failedUsageCreate).not.toHaveBeenCalled();
    expect(f.successUsageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "CHAT",
        status: "SUCCESS",
        inputTokens: 3,
        outputTokens: 4,
      }),
    );
  });

  it("charges two units and builds a grounded prompt", async () => {
    const f = fixture({ id: 10, userId: 5, providerId: 4 });
    const result = await f.service.send(5, {
      conversationId: 10,
      prompt: "hello",
      webSearch: true,
    });
    expect(f.subscriptions.assertAvailable).toHaveBeenCalledWith(5, 2);
    expect(f.search.retrieveForChat).toHaveBeenCalledWith(5, "hello");
    expect(f.providers.generate).toHaveBeenCalledWith(
      4,
      expect.stringContaining("<web_references>"),
    );
    expect(result.message.sources[0]).toMatchObject({
      citation: 1,
      url: "https://docs.nestjs.com/",
    });
    expect(result).not.toHaveProperty("sources");
    expect(f.userMessageCreate).toHaveBeenCalledTimes(1);
    expect(f.assistantMessageCreate).toHaveBeenCalledTimes(1);
    expect(f.sourceCreate).toHaveBeenCalledWith({
      messageId: 2,
      citation: 1,
      title: "NestJS",
      url: "https://docs.nestjs.com/",
      hostname: "docs.nestjs.com",
      publishedAt: null,
    });
    expect(f.successUsageCreate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "SUCCESS", operation: "CHAT" }),
    );
    expect(f.failedUsageCreate).not.toHaveBeenCalled();
  });

  it("hides another user's conversation", async () => {
    const f = fixture(null);
    await expect(
      f.service.send(99, { conversationId: 10, prompt: "hello" }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(f.providers.generate).not.toHaveBeenCalled();
    expect(f.userMessageCreate).not.toHaveBeenCalled();
    expect(f.transaction).not.toHaveBeenCalled();
    expect(f.failedUsageCreate).not.toHaveBeenCalled();
  });

  it("records FAILED when the provider fails", async () => {
    const f = fixture({ id: 10, userId: 5, providerId: 4 });
    f.providers.generate.mockRejectedValue(new Error("provider unavailable"));
    await expect(f.service.send(5, { conversationId: 10, prompt: "hello" })).rejects.toThrow(
      "provider unavailable",
    );
    expect(f.failedUsageCreate).toHaveBeenCalledWith(
      expect.objectContaining({ operation: "CHAT", status: "FAILED" }),
    );
    expect(f.transaction).not.toHaveBeenCalled();
    expect(f.assistantMessageCreate).not.toHaveBeenCalled();
    expect(f.successUsageCreate).not.toHaveBeenCalled();
  });

  it("stores sanitized source metadata and preserves citation numbers", async () => {
    const f = fixture({ id: 10, userId: 5, providerId: 4 });
    const retrieved = {
      query: "hello",
      sources: [
        {
          citation: 4,
          title: "First reference",
          url: "https://first.example.test/",
          snippets: ["private snippet"],
          siteName: "untrusted site label",
        },
        {
          citation: 9,
          title: "Second reference",
          url: "https://second.example.test/",
          snippets: ["another snippet"],
          hostname: "second.example.test",
          publishedAt: "2026-01-02T00:00:00.000Z",
        },
      ],
    };
    f.search.retrieveForChat.mockResolvedValue(retrieved);
    const result = await f.service.send(5, {
      conversationId: 10,
      prompt: "hello",
      webSearch: true,
    });

    expect(result).toEqual({
      message: {
        ...f.assistantMessage,
        sources: [
          {
            citation: 4,
            title: "First reference",
            url: "https://first.example.test/",
            hostname: null,
            publishedAt: null,
          },
          {
            citation: 9,
            title: "Second reference",
            url: "https://second.example.test/",
            hostname: "second.example.test",
            publishedAt: "2026-01-02T00:00:00.000Z",
          },
        ],
      },
    });
    expect(f.sourceCreate).toHaveBeenNthCalledWith(1, {
      messageId: 2,
      citation: 4,
      title: "First reference",
      url: "https://first.example.test/",
      hostname: null,
      publishedAt: null,
    });
    expect(f.sourceCreate).toHaveBeenNthCalledWith(2, {
      messageId: 2,
      citation: 9,
      title: "Second reference",
      url: "https://second.example.test/",
      hostname: "second.example.test",
      publishedAt: "2026-01-02T00:00:00.000Z",
    });
    expect(JSON.stringify(result)).not.toContain("private snippet");
    expect(JSON.stringify(result)).not.toContain("untrusted site label");
    expect(f.sourceCreate.mock.calls[0][0]).not.toHaveProperty("snippets");
    expect(f.sourceCreate.mock.calls[0][0]).not.toHaveProperty("siteName");
  });

  it("does not search for ordinary prompts and handles empty search sources", async () => {
    const withoutSearch = fixture({ id: 10, userId: 5, providerId: 4 });
    const regularResult = await withoutSearch.service.send(5, {
      conversationId: 10,
      prompt: "hello",
    });
    expect(regularResult.message.sources).toEqual([]);
    expect(withoutSearch.search.retrieveForChat).not.toHaveBeenCalled();
    expect(withoutSearch.sourceCreate).not.toHaveBeenCalled();

    const emptySearch = fixture({ id: 10, userId: 5, providerId: 4 });
    emptySearch.search.retrieveForChat.mockResolvedValue({ query: "hello", sources: [] });
    const searchedResult = await emptySearch.service.send(5, {
      conversationId: 10,
      prompt: "hello",
      webSearch: true,
    });
    expect(searchedResult.message.sources).toEqual([]);
    expect(emptySearch.sourceCreate).not.toHaveBeenCalled();
    expect(emptySearch.successUsageCreate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "SUCCESS" }),
    );
  });

  it("records FAILED and skips the success log when a source insert fails", async () => {
    const f = fixture({ id: 10, userId: 5, providerId: 4 });
    f.sourceCreate.mockRejectedValue(new Error("source insert failed"));
    await expect(
      f.service.send(5, { conversationId: 10, prompt: "hello", webSearch: true }),
    ).rejects.toThrow("source insert failed");
    expect(f.transaction).toHaveBeenCalledTimes(1);
    expect(f.assistantMessageCreate).toHaveBeenCalledTimes(1);
    expect(f.failedUsageCreate).toHaveBeenCalledWith(
      expect.objectContaining({ operation: "CHAT", status: "FAILED" }),
    );
    expect(f.successUsageCreate).not.toHaveBeenCalled();
  });

  it("records FAILED when the transaction success log fails", async () => {
    const f = fixture({ id: 10, userId: 5, providerId: 4 });
    f.successUsageCreate.mockRejectedValue(new Error("transaction failed"));
    await expect(f.service.send(5, { conversationId: 10, prompt: "hello" })).rejects.toThrow(
      "transaction failed",
    );
    expect(f.failedUsageCreate).toHaveBeenCalledWith(
      expect.objectContaining({ operation: "CHAT", status: "FAILED" }),
    );
    expect(f.successUsageCreate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "SUCCESS" }),
    );
  });

  it("does not transact or save an assistant when search retrieval fails", async () => {
    const f = fixture({ id: 10, userId: 5, providerId: 4 });
    f.search.retrieveForChat.mockRejectedValue(new Error("search unavailable"));
    await expect(
      f.service.send(5, { conversationId: 10, prompt: "hello", webSearch: true }),
    ).rejects.toThrow("search unavailable");
    expect(f.userMessageCreate).toHaveBeenCalledTimes(1);
    expect(f.providers.generate).not.toHaveBeenCalled();
    expect(f.transaction).not.toHaveBeenCalled();
    expect(f.assistantMessageCreate).not.toHaveBeenCalled();
    expect(f.failedUsageCreate).toHaveBeenCalledWith(expect.objectContaining({ status: "FAILED" }));
  });

  it("denies quota before writing messages, transactions, or usage logs", async () => {
    const f = fixture({ id: 10, userId: 5, providerId: 4 });
    f.subscriptions.assertAvailable.mockRejectedValue(new Error("quota exceeded"));
    await expect(f.service.send(5, { conversationId: 10, prompt: "hello" })).rejects.toThrow(
      "quota exceeded",
    );
    expect(f.userMessageCreate).not.toHaveBeenCalled();
    expect(f.transaction).not.toHaveBeenCalled();
    expect(f.failedUsageCreate).not.toHaveBeenCalled();
    expect(f.successUsageCreate).not.toHaveBeenCalled();
    expect(f.providers.generate).not.toHaveBeenCalled();
  });

  it("projects and orders message sources and does not call providers or search", async () => {
    const f = fixture({ id: 10, userId: 5, providerId: 4 });
    const messages = await f.service.listMessages(5, 10);
    expect(messages).toEqual([f.historyMessage]);
    expect(f.messageWhere).toHaveBeenCalledWith({ conversationId: 10 });
    expect(f.messageQuery.select).toHaveBeenCalledWith(
      "id",
      "role",
      "content",
      "inputTokens",
      "outputTokens",
      "createdAt",
    );
    expect(f.messageQuery.include).toHaveBeenCalledWith("sources", expect.any(Function));
    expect(f.sourceQuery.select).toHaveBeenCalledWith(
      "citation",
      "title",
      "url",
      "hostname",
      "publishedAt",
    );
    const citationOrder = f.sourceQuery.orderBy.mock.calls[0]?.[0] as (source: {
      citation: { asc: () => string };
    }) => string;
    const citationAscending = vi.fn().mockReturnValue("citation ascending");
    expect(citationOrder({ citation: { asc: citationAscending } })).toBe("citation ascending");
    expect(citationAscending).toHaveBeenCalledTimes(1);
    const messageOrder = f.messageQuery.orderBy.mock.calls[0]?.[0] as ((message: {
      createdAt: { asc: () => string };
      id: { asc: () => string };
    }) => string)[];
    const createdAtAscending = vi.fn().mockReturnValue("createdAt ascending");
    const idAscending = vi.fn().mockReturnValue("id ascending");
    const orderResults = messageOrder.map((order) =>
      order({
        createdAt: { asc: createdAtAscending },
        id: { asc: idAscending },
      }),
    );
    expect(orderResults).toEqual(["createdAt ascending", "id ascending"]);
    expect(createdAtAscending).toHaveBeenCalledTimes(1);
    expect(idAscending).toHaveBeenCalledTimes(1);
    expect(f.providers.generate).not.toHaveBeenCalled();
    expect(f.search.retrieveForChat).not.toHaveBeenCalled();
    expect(f.messageQuery.all).toHaveBeenCalledTimes(1);
  });

  it("does not query messages when list authorization fails", async () => {
    const f = fixture(null);
    await expect(f.service.listMessages(99, 10)).rejects.toBeInstanceOf(NotFoundException);
    expect(f.messageWhere).not.toHaveBeenCalled();
    expect(f.messageQuery.all).not.toHaveBeenCalled();
  });
});
