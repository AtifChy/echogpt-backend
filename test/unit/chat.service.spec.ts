import { NotFoundException } from "@nestjs/common";

import { ChatService } from "../../src/chat/chat.service";

function fixture(conversation: { id: number; userId: number; providerId: number } | null) {
  const first = vi.fn().mockResolvedValue(conversation);
  const messageCreate = vi
    .fn()
    .mockResolvedValueOnce({ id: 1, role: "USER", content: "hello" })
    .mockResolvedValueOnce({ id: 2, role: "ASSISTANT", content: "answer" });
  const usageCreate = vi.fn().mockResolvedValue({ id: 1 });
  const prisma = {
    db: {
      orm: {
        public: {
          Conversation: { where: vi.fn().mockReturnValue({ first }) },
          Message: { create: messageCreate },
          ApiUsageLog: { create: usageCreate },
        },
      },
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
    subscriptions,
    search,
    usageCreate,
  };
}

describe("ChatService", () => {
  it("trims a prompt and logs successful token usage", async () => {
    const f = fixture({ id: 10, userId: 5, providerId: 4 });
    await expect(
      f.service.send(5, { conversationId: 10, prompt: "  hello  " }),
    ).resolves.toMatchObject({
      message: { role: "ASSISTANT", content: "answer" },
      sources: [],
    });
    expect(f.subscriptions.assertAvailable).toHaveBeenCalledWith(5, 1);
    expect(f.providers.generate).toHaveBeenCalledWith(4, "hello");
    expect(f.usageCreate).toHaveBeenCalledWith(
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
    expect(result.sources[0]).toMatchObject({
      citation: 1,
      url: "https://docs.nestjs.com/",
    });
  });

  it("hides another user's conversation", async () => {
    const f = fixture(null);
    await expect(
      f.service.send(99, { conversationId: 10, prompt: "hello" }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(f.providers.generate).not.toHaveBeenCalled();
  });

  it("records FAILED when the provider fails", async () => {
    const f = fixture({ id: 10, userId: 5, providerId: 4 });
    f.providers.generate.mockRejectedValue(new Error("provider unavailable"));
    await expect(f.service.send(5, { conversationId: 10, prompt: "hello" })).rejects.toThrow(
      "provider unavailable",
    );
    expect(f.usageCreate).toHaveBeenCalledWith(
      expect.objectContaining({ operation: "CHAT", status: "FAILED" }),
    );
  });
});
