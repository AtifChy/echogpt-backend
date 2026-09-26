import { BadRequestException, ConflictException } from "@nestjs/common";

import { ProvidersService } from "../../src/providers/providers.service";

const provider = {
  id: 4,
  name: "OpenAI",
  type: "OPENAI" as const,
  model: "gpt-test",
  encryptedApiKey: "encrypted",
  apiKeyIv: "iv",
  apiKeyAuthTag: "tag",
  enabled: true,
  isDefault: false,
};

function fixture(stored: typeof provider | null = provider) {
  const first = vi.fn().mockResolvedValue(stored);
  const update = vi.fn().mockResolvedValue(undefined);
  const remove = vi.fn().mockResolvedValue(undefined);
  const where = vi.fn().mockReturnValue({ first, update, delete: remove });
  const create = vi.fn().mockResolvedValue(provider);
  const prisma = {
    db: {
      orm: { public: { AiProvider: { where, create } } },
      transaction: vi.fn(),
    },
  };
  const cipher = {
    encrypt: vi.fn().mockReturnValue({
      encryptedApiKey: "encrypted",
      apiKeyIv: "iv",
      apiKeyAuthTag: "tag",
    }),
    decrypt: vi.fn().mockReturnValue("plain-api-key"),
  };
  const openai = {
    type: "OPENAI" as const,
    generate: vi.fn().mockResolvedValue({ content: "answer", inputTokens: 2, outputTokens: 3 }),
  };
  const anthropic = { type: "ANTHROPIC" as const, generate: vi.fn() };
  const gemini = { type: "GEMINI" as const, generate: vi.fn() };

  return {
    service: new ProvidersService(
      prisma as never,
      cipher as never,
      openai as never,
      anthropic as never,
      gemini as never,
    ),
    create,
    cipher,
    openai,
  };
}

describe("ProvidersService", () => {
  it("encrypts a key and never returns encrypted columns", async () => {
    const { service, create, cipher } = fixture();
    const result = await service.create({
      name: "OpenAI",
      type: "OPENAI",
      model: "gpt-test",
      apiKey: "plain-api-key",
      enabled: true,
    });

    expect(cipher.encrypt).toHaveBeenCalledWith("plain-api-key");
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ encryptedApiKey: "encrypted" }));
    expect(result).toEqual({
      id: 4,
      name: "OpenAI",
      type: "OPENAI",
      model: "gpt-test",
      enabled: true,
      isDefault: false,
      hasApiKey: true,
    });
    expect(JSON.stringify(result)).not.toContain("encryptedApiKey");
  });

  it("rejects an unsupported provider", async () => {
    const { service } = fixture();
    await expect(
      service.create({
        name: "Unknown",
        type: "UNKNOWN" as never,
        model: "unknown",
        apiKey: "key",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("decrypts only when generating", async () => {
    const { service, cipher, openai } = fixture();
    await service.generate(4, "hello");
    expect(cipher.decrypt).toHaveBeenCalledWith(provider);
    expect(openai.generate).toHaveBeenCalledWith({
      apiKey: "plain-api-key",
      model: "gpt-test",
      prompt: "hello",
    });
  });

  it("does not call an adapter for a disabled provider", async () => {
    const { service, openai } = fixture({ ...provider, enabled: false });
    await expect(service.generate(4, "hello")).rejects.toBeInstanceOf(ConflictException);
    expect(openai.generate).not.toHaveBeenCalled();
  });
});
