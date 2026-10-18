import { describe, expect, it } from "bun:test";

import { z } from "zod";

import { PaginationSchema } from "../../src/admin/dto/pagination.dto";
import { UpdateUserStatusSchema } from "../../src/admin/dto/update-user-status.dto";
import { AuthResponseSchema } from "../../src/auth/dto/auth-response.dto";
import { LoginSchema } from "../../src/auth/dto/login.dto";
import { RefreshSchema } from "../../src/auth/dto/refresh.dto";
import { RegisterSchema } from "../../src/auth/dto/register.dto";
import { CreateConversationSchema } from "../../src/chat/dto/create-conversation.dto";
import { ChatResponseSchema } from "../../src/chat/dto/message-response.dto";
import { SendPromptSchema } from "../../src/chat/dto/send-prompt.dto";
import { RoleSchema } from "../../src/common/schemas/enums.schema";
import { TimestampSchema } from "../../src/common/schemas/primitives.schema";
import { EnvSchema, validateEnv } from "../../src/config/env.validation";
import { CreateProviderSchema } from "../../src/providers/dto/create-provider.dto";
import { ProviderResponseSchema } from "../../src/providers/dto/provider-response.dto";
import { SetEnabledProviderSchema } from "../../src/providers/dto/set-enabled-provider.dto";
import { UpdateProviderSchema } from "../../src/providers/dto/update-provider.dto";
import { SearchContextSchema } from "../../src/search/dto/search-context.dto";
import { SearchResponseSchema } from "../../src/search/dto/search-response.dto";
import { SuggestionQuerySchema } from "../../src/search/dto/suggestions-query.dto";
import { UpdateSubscriptionSchema } from "../../src/subscriptions/dto/update-subscription.dto";
import { ChangePasswordSchema } from "../../src/users/dto/change-password.dto";
import { ProfileResponseSchema } from "../../src/users/dto/profile-response.dto";
import { UpdateProfileSchema } from "../../src/users/dto/update-profile.dto";

const password = " correct-password ";
const timestamp = "2026-01-01T00:00:00.000Z";
const validRequests: Array<[string, z.ZodType, Record<string, unknown>]> = [
  ["register", RegisterSchema, { email: "user@example.com", password }],
  ["login", LoginSchema, { email: "user@example.com", password }],
  ["refresh", RefreshSchema, { refreshToken: "x".repeat(43) }],
  ["profile", UpdateProfileSchema, { displayName: "Atif" }],
  ["password", ChangePasswordSchema, { currentPassword: password, newPassword: password }],
  ["pagination", PaginationSchema, { page: "1", limit: "25" }],
  ["status", UpdateUserStatusSchema, { status: "ACTIVE" }],
  ["subscription", UpdateSubscriptionSchema, { plan: "FREE" }],
  [
    "provider",
    CreateProviderSchema,
    { name: "Primary", type: "OPENAI", model: "gpt-5", apiKey: "test-secret-key" },
  ],
  ["provider edit", UpdateProviderSchema, { model: "gpt-5" }],
  ["enabled", SetEnabledProviderSchema, { enabled: false }],
  ["conversation", CreateConversationSchema, { title: "My research" }],
  ["prompt", SendPromptSchema, { conversationId: 1, prompt: "Hi" }],
  ["search", SearchContextSchema, { query: "NestJS docs" }],
  ["suggestions", SuggestionQuerySchema, { q: "nestjs" }],
];

describe("Zod request contracts", () => {
  it("normalizes optional nulls to undefined at the request boundary", () => {
    const fields: z.ZodType[] = [
      RegisterSchema.shape.displayName,
      UpdateProfileSchema.shape.displayName,
      CreateConversationSchema.shape.providerId,
      CreateConversationSchema.shape.title,
      SendPromptSchema.shape.webSearch,
      CreateProviderSchema.shape.enabled,
      UpdateProviderSchema.shape.name,
      UpdateProviderSchema.shape.model,
      UpdateProviderSchema.shape.apiKey,
      UpdateSubscriptionSchema.shape.status,
      SearchContextSchema.shape.country,
      SearchContextSchema.shape.searchLang,
      SearchContextSchema.shape.count,
      SearchContextSchema.shape.maximumTokens,
      SearchContextSchema.shape.safesearch,
      SearchContextSchema.shape.freshness,
    ];
    for (const field of fields) {
      expect(field.parse(null)).toBeUndefined();
      expect(field.parse(undefined)).toBeUndefined();
    }
    expect(SendPromptSchema.shape.webSearch.parse(false)).toBe(false);
    expect(CreateProviderSchema.shape.enabled.parse(false)).toBe(false);
  });

  for (const [name, schema, value] of validRequests) {
    it(`accepts valid ${name} and rejects unknown fields`, () => {
      expect(schema.safeParse(value).success).toBe(true);
      expect(schema.safeParse({ ...value, unexpected: true }).success).toBe(false);
    });
  }

  it("preserves passwords and the less restrictive login/current-password rules", () => {
    expect(RegisterSchema.parse({ email: "user@example.com", password }).password).toBe(password);
    expect(LoginSchema.parse({ email: "user@example.com", password: "" }).password).toBe("");
    expect(
      ChangePasswordSchema.parse({ currentPassword: "", newPassword: password }).currentPassword,
    ).toBe("");
    expect(RegisterSchema.safeParse({ email: "bad", password: "short" }).success).toBe(false);
    expect(RefreshSchema.safeParse({ refreshToken: "short" }).success).toBe(false);
  });

  it("validates normalized title lengths", () => {
    expect(CreateConversationSchema.parse({ title: "  My   research\nnotes  " }).title).toBe(
      "My research notes",
    );
    expect(CreateConversationSchema.safeParse({ title: " " }).success).toBe(false);
    expect(CreateConversationSchema.safeParse({ title: "x".repeat(60) }).success).toBe(true);
    expect(CreateConversationSchema.safeParse({ title: "x".repeat(61) }).success).toBe(false);
  });

  it("parses pagination defaults and rejects ambiguous/unsafe values", () => {
    expect(PaginationSchema.parse({})).toEqual({ page: 1, limit: 25 });
    expect(PaginationSchema.parse({ page: "2", limit: "100" })).toEqual({ page: 2, limit: 100 });
    for (const value of [
      "",
      "0",
      "-1",
      "1.5",
      "1e2",
      "0x10",
      " 1 ",
      "01",
      "abc",
      ["1"],
      ["1", "2"],
      null,
      true,
      {},
      Number.MAX_SAFE_INTEGER + 1,
      "9007199254740992",
    ]) {
      expect(PaginationSchema.safeParse({ page: value }).success).toBe(false);
    }
    expect(PaginationSchema.safeParse({ limit: "101" }).success).toBe(false);
  });

  it("does not coerce body IDs, numbers, or booleans", () => {
    expect(SendPromptSchema.safeParse({ conversationId: "1", prompt: "Hi" }).success).toBe(false);
    expect(
      SendPromptSchema.safeParse({ conversationId: 1, prompt: "Hi", webSearch: "false" }).success,
    ).toBe(false);
    expect(SetEnabledProviderSchema.safeParse({ enabled: "false" }).success).toBe(false);
    expect(SetEnabledProviderSchema.safeParse({}).success).toBe(false);
    expect(CreateConversationSchema.safeParse({ providerId: "1" }).success).toBe(false);
  });

  it("preserves length limits and restricts enums and immutable provider fields", () => {
    expect(UpdateProfileSchema.safeParse({ displayName: "x".repeat(81) }).success).toBe(false);
    expect(
      RegisterSchema.safeParse({ email: "user@example.com", password, displayName: "x".repeat(90) })
        .success,
    ).toBe(true);
    expect(
      RegisterSchema.safeParse({ email: "user@example.com", password, displayName: "x".repeat(91) })
        .success,
    ).toBe(false);
    expect(UpdateProviderSchema.safeParse({ type: "GEMINI" }).success).toBe(false);
    expect(UpdateProviderSchema.safeParse({ apiKey: "" }).success).toBe(false);
    expect(UpdateUserStatusSchema.safeParse({ status: "DELETED" }).success).toBe(false);
    expect(UpdateSubscriptionSchema.safeParse({ plan: "ENTERPRISE" }).success).toBe(false);
    expect(RoleSchema.options.slice().sort()).toEqual(["ADMIN", "USER"]);
  });

  it("normalizes search input and validates bounds", () => {
    expect(SearchContextSchema.parse({ query: "  NestJS docs  ", country: " us " })).toMatchObject({
      query: "NestJS docs",
      country: "US",
    });
    for (const query of ["", " ", "x".repeat(401), Array(51).fill("word").join(" ")]) {
      expect(SearchContextSchema.safeParse({ query }).success).toBe(false);
    }
    for (const fields of [
      { count: 0 },
      { count: 51 },
      { count: "20" },
      { maximumTokens: 1023 },
      { maximumTokens: 8193 },
      { safesearch: "yes" },
      { freshness: "yesterday" },
      { country: "USA" },
    ]) {
      expect(SearchContextSchema.safeParse({ query: "NestJS", ...fields }).success).toBe(false);
    }
    expect(SuggestionQuerySchema.parse({ q: "  nestjs  " }).q).toBe("nestjs");
    expect(SuggestionQuerySchema.safeParse({ q: " " }).success).toBe(false);
  });
});

describe("Zod public response contracts", () => {
  it("preserves ISO and PostgreSQL timestamps, including microseconds and offsets", () => {
    for (const value of [
      timestamp,
      "2026-10-17 19:44:26.77117+00",
      "2026-10-17 19:44:26+05:30",
      "2026-10-17T19:44:26.123456+05:30",
    ]) {
      expect(TimestampSchema.parse(value)).toBe(value);
    }
    for (const value of [
      "yesterday",
      "2026-02-30 19:44:26+00",
      "2026-10-17 25:44:26+00",
      "2026-10-17",
    ]) {
      expect(TimestampSchema.safeParse(value).success).toBe(false);
    }
  });
  it("retains auth tokens and nullable names while stripping nested secrets", () => {
    const result = AuthResponseSchema.parse({
      user: {
        id: 1,
        email: "user@example.com",
        displayName: null,
        role: "USER",
        passwordHash: "private",
      },
      accessToken: "access",
      refreshToken: "refresh",
      tokenHash: "private",
    });
    expect(result.user.displayName).toBeNull();
    expect(result.accessToken).toBe("access");
    expect(result.refreshToken).toBe("refresh");
    expect(JSON.stringify(result)).not.toContain("private");
  });

  it("keeps profile roles as objects and strips their internal fields", () => {
    const result = ProfileResponseSchema.parse({
      id: 1,
      email: "user@example.com",
      displayName: null,
      status: "ACTIVE",
      createdAt: timestamp,
      role: { name: "USER", internal: "private" },
      passwordHash: "private",
    });
    expect(result.role).toEqual({ name: "USER" });
    expect(JSON.stringify(result)).not.toContain("private");
  });

  it("excludes all provider key fields", () => {
    const result = ProviderResponseSchema.parse({
      id: 1,
      name: "Primary",
      type: "OPENAI",
      model: "gpt-5",
      enabled: true,
      isDefault: false,
      hasApiKey: true,
      apiKey: "private",
      encryptedApiKey: "private",
      apiKeyIv: "private",
      apiKeyAuthTag: "private",
    });
    expect(Object.keys(result).sort()).toEqual([
      "enabled",
      "hasApiKey",
      "id",
      "isDefault",
      "model",
      "name",
      "type",
    ]);
    expect(JSON.stringify(result)).not.toContain("private");
  });

  it("keeps saved citations and requires complete message responses", () => {
    const message = {
      id: 2,
      conversationId: 1,
      role: "ASSISTANT",
      content: "Answer [1]",
      inputTokens: 1,
      outputTokens: 2,
      createdAt: timestamp,
      sources: [
        {
          citation: 1,
          title: "Docs",
          url: "https://docs.nestjs.com/",
          hostname: null,
          publishedAt: null,
          internal: "private",
        },
      ],
    };
    const result = ChatResponseSchema.parse({ message, sources: "private" });
    expect(Object.keys(result)).toEqual(["message"]);
    expect(result.message.sources).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain("private");
    expect(
      ChatResponseSchema.parse({ message: { ...message, sources: [] } }).message.sources,
    ).toEqual([]);
    expect(ChatResponseSchema.safeParse({ message: { ...message, id: undefined } }).success).toBe(
      false,
    );
  });

  it("preserves optional direct search metadata, snippets, and relative dates", () => {
    const result = SearchResponseSchema.parse({
      searchId: 1,
      query: "NestJS",
      sources: [
        {
          citation: 1,
          title: "Docs",
          url: "https://docs.nestjs.com/",
          snippets: ["NestJS"],
          siteName: "NestJS",
          publishedAt: "2 days ago",
        },
      ],
    });
    expect(result.sources[0]?.snippets).toEqual(["NestJS"]);
    expect(result.sources[0]?.siteName).toBe("NestJS");
    expect(result.sources[0]?.publishedAt).toBe("2 days ago");
  });
});

describe("Zod environment configuration", () => {
  const env = {
    DATABASE_URL: "postgresql://test:test@localhost:5432/echogpt_test",
    JWT_ACCESS_SECRET: "test-secret-".repeat(4),
    CORS_ORIGINS: "http://localhost:5173",
    PROVIDER_ENCRYPTION_KEY_BASE64: Buffer.alloc(32).toString("base64"),
    BRAVE_SEARCH_API_KEY: "test-brave-key-".repeat(3),
  };

  it("applies defaults, coerces numeric variables, and permits unrelated OS keys", () => {
    expect(validateEnv({ ...env, PATH: "test", PORT: "4000" })).toMatchObject({
      PORT: 4000,
      NODE_ENV: "development",
      REFRESH_TOKEN_TTL_DAYS: 7,
      SEARCH_CACHE_MINUTES: 60,
      PATH: "test",
    });
    expect(validateEnv(env).PORT).toBe(3000);
  });

  it("rejects invalid database URLs without throwing inside the schema", () => {
    for (const DATABASE_URL of ["invalid", "https://example.com", "", "postgresql://["]) {
      expect(EnvSchema.safeParse({ ...env, DATABASE_URL }).success).toBe(false);
    }
  });

  it("validates port, TTL, CORS, secrets, and exactly 32 decoded key bytes", () => {
    for (const fields of [
      { PORT: "0" },
      { PORT: "65536" },
      { PORT: "1.5" },
      { REFRESH_TOKEN_TTL_DAYS: "0" },
      { SEARCH_CACHE_MINUTES: "0" },
      { CORS_ORIGINS: "" },
      { JWT_ACCESS_SECRET: "short" },
      { PROVIDER_ENCRYPTION_KEY_BASE64: "not-base64" },
      { PROVIDER_ENCRYPTION_KEY_BASE64: Buffer.alloc(16).toString("base64") },
    ]) {
      expect(EnvSchema.safeParse({ ...env, ...fields }).success).toBe(false);
    }
  });

  it("reports field errors without including secret input values", () => {
    expect(() => validateEnv({ ...env, JWT_ACCESS_SECRET: "DO_NOT_ECHO" })).toThrow(
      "JWT_ACCESS_SECRET",
    );
    try {
      validateEnv({ ...env, JWT_ACCESS_SECRET: "DO_NOT_ECHO" });
      throw new Error("Expected invalid environment to throw");
    } catch (error) {
      expect(String(error)).toContain("Invalid environment configuration");
      expect(String(error)).not.toContain("DO_NOT_ECHO");
    }
  });
});
