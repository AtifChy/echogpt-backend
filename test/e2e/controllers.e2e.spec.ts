import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it, vi } from "bun:test";

import {
  UnauthorizedException,
  type ExecutionContext,
  type INestApplication,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AdminService } from "../../src/admin/admin.service";
import { AppModule } from "../../src/app.module";
import { AuthService } from "../../src/auth/auth.service";
import { JwtAuthGuard } from "../../src/auth/jwt-auth.guard";
import { ChatService } from "../../src/chat/chat.service";
import { configureApp } from "../../src/configure-app";
import { PrismaService } from "../../src/prisma.service";
import { ProvidersService } from "../../src/providers/providers.service";
import { SearchService } from "../../src/search/search.service";
import { SubscriptionsService } from "../../src/subscriptions/subscriptions.service";
import { UserService } from "../../src/users/users.service";

const timestamp = "2026-01-01T00:00:00.000Z";
const tokens = { accessToken: "fake-access", refreshToken: "fake-refresh-token".repeat(3) };
const profile = {
  id: 1,
  email: "controller@example.com",
  displayName: null,
  status: "ACTIVE",
  createdAt: timestamp,
  role: "USER",
};
const conversation = {
  id: 7,
  userId: 1,
  providerId: 2,
  title: "Controller test",
  createdAt: timestamp,
  updatedAt: timestamp,
};
const provider = {
  id: 2,
  name: "Test",
  type: "OPENAI",
  model: "mock-model",
  enabled: false,
  isDefault: false,
  hasApiKey: true,
};
const subscription = {
  id: 1,
  userId: 1,
  plan: "FREE",
  status: "ACTIVE",
  currentPeriodStart: timestamp,
  currentPeriodEnd: "2026-02-01T00:00:00.000Z",
  createdAt: timestamp,
  updatedAt: timestamp,
};
const usage = {
  plan: "FREE",
  status: "ACTIVE",
  limit: 100,
  used: 0,
  remaining: 100,
  periodStart: timestamp,
  periodEnd: subscription.currentPeriodEnd,
};
const providerList = [
  {
    id: provider.id,
    name: provider.name,
    type: provider.type,
    model: provider.model,
    enabled: provider.enabled,
    isDefault: provider.isDefault,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
];
const adminUsers = [
  {
    ...profile,
    updatedAt: timestamp,
    subscriptions: {
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
    },
  },
];
const adminSubscriptions = [
  {
    id: subscription.id,
    userId: subscription.userId,
    ...adminUsers[0]!.subscriptions,
    user: { email: profile.email, displayName: profile.displayName },
  },
];
const requestLogs = [
  {
    requestId: 1,
    userId: 1,
    providerId: 2,
    operation: "CHAT",
    status: "SUCCESS",
    latencyMs: 1,
    createdAt: timestamp,
  },
];
const systemHealth = {
  status: "ok",
  database: "up",
  databaseLatencyMs: 1,
  uptimeSeconds: 1,
  timestamp,
  memory: { rss: 100, heapTotal: 80, heapUsed: 60, external: 20, arrayBuffers: 10 },
};
const searchResult = {
  searchId: 1,
  query: "NestJS",
  sources: [
    {
      citation: 1,
      title: "Docs",
      url: "https://docs.nestjs.com/",
      snippets: ["NestJS docs"],
      hostname: "docs.nestjs.com",
      siteName: "NestJS",
      publishedAt: "2 days ago",
    },
  ],
};
const searchHistory = [{ id: 1, query: "NestJS", createdAt: timestamp }];
const auth = {
  register: vi.fn((dto: { email: string; displayName?: string }) => ({
    ...tokens,
    tokenHash: "private-hash",
    user: {
      id: 1,
      email: dto.email,
      displayName: dto.displayName ?? null,
      role: "USER",
      passwordHash: "private-hash",
    },
  })),
  login: vi.fn(() => ({
    ...tokens,
    user: { id: 1, email: profile.email, displayName: null, role: "USER" },
  })),
  refresh: vi.fn(() => ({ ...tokens, tokenHash: "private-hash" })),
  logout: vi.fn(),
};
const users = {
  findMe: vi.fn(() => profile),
  updateProfile: vi.fn(() => profile),
  changePassword: vi.fn(),
  deleteAccount: vi.fn(),
};
const chat = {
  createConversation: vi.fn((_id: number, dto: { title?: string }) => ({
    ...conversation,
    title: dto.title ?? "New Conversation",
  })),
  listConversations: vi.fn(() => [conversation]),
  listMessages: vi.fn(() => []),
  send: vi.fn(() => ({
    message: {
      id: 3,
      conversationId: 7,
      role: "ASSISTANT",
      content: "Mocked answer",
      inputTokens: 1,
      outputTokens: 2,
      createdAt: timestamp,
      sources: [],
    },
  })),
  removeConversation: vi.fn(),
};
const providers = {
  create: vi.fn(() => provider),
  list: vi.fn(() => providerList),
  update: vi.fn(() => provider),
  setEnabled: vi.fn(() => provider),
  setDefault: vi.fn(() => provider),
  remove: vi.fn(),
  health: vi.fn(() => ({ status: "ok", latency: 1 })),
};
const search = {
  search: vi.fn(() => searchResult),
  history: vi.fn(() => searchHistory),
  recent: vi.fn(() => searchHistory),
  suggestions: vi.fn(() => ["NestJS"]),
  clearHistory: vi.fn(),
};
const admin = {
  dashboard: vi.fn(() => ({ users: 1, conversations: 1, searches: 0, requests: 0 })),
  users: vi.fn(() => adminUsers),
  subscriptions: vi.fn(() => adminSubscriptions),
  requestLogs: vi.fn(() => requestLogs),
  updateUserStatus: vi.fn(() => ({ id: 1, status: "ACTIVE" })),
  health: vi.fn(() => systemHealth),
};
const subscriptions = {
  getSubscription: vi.fn(() => subscription),
  getUsage: vi.fn(() => usage),
  updateSubscription: vi.fn(() => ({ ...subscription, plan: "PREMIUM" })),
};

describe("Controllers (isolated services, no database or network providers)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const builder = Test.createTestingModule({ imports: [AppModule] });
    for (const [token, value] of [
      [AuthService, auth],
      [UserService, users],
      [ChatService, chat],
      [ProvidersService, providers],
      [SearchService, search],
      [AdminService, admin],
      [SubscriptionsService, subscriptions],
      [
        PrismaService,
        {
          get db() {
            throw new Error("Unexpected database access in controller tests");
          },
        },
      ],
    ] as const)
      builder.overrideProvider(token).useValue(value);

    builder.overrideGuard(JwtAuthGuard).useValue({
      canActivate(context: ExecutionContext) {
        const incoming = context.switchToHttp().getRequest();
        const authorization = incoming.headers.authorization;
        if (!authorization) throw new UnauthorizedException();
        incoming.user = {
          userId: 1,
          sessionId: 1,
          role: authorization === "Bearer test-admin" ? "ADMIN" : "USER",
        };
        return true;
      },
    });
    const module = await builder.compile();
    app = module.createNestApplication();
    app.useLogger(false);
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it("uses the auth response DTO without dropping tokens or returning hashes", async () => {
    const registered = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: profile.email, password: "long-password" })
      .expect(201);
    expect(registered.body).toEqual({
      ...tokens,
      user: { id: 1, email: profile.email, displayName: null, role: "USER" },
    });
    expect(JSON.stringify(registered.body)).not.toContain("private-hash");

    const loggedIn = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: profile.email, password: "long-password" })
      .expect(200);
    expect(loggedIn.body.user.displayName).toBeNull();
    expect(loggedIn.body.accessToken).toBe(tokens.accessToken);
    const refreshed = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: tokens.refreshToken })
      .expect(200);
    expect(refreshed.body).toEqual(tokens);
  });

  it("keeps authentication and real role restrictions on protected routes", async () => {
    await request(app.getHttpServer()).get("/api/v1/users/me").expect(401);
    await request(app.getHttpServer())
      .get("/api/v1/admin/users")
      .set("Authorization", "Bearer test-user")
      .expect(403);
    await request(app.getHttpServer())
      .get("/api/v1/admin/users")
      .set("Authorization", "Bearer test-admin")
      .expect(200);
  });

  it("parses default pagination before passing it to the admin service", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/admin/users")
      .set("Authorization", "Bearer test-admin")
      .expect(200);
    expect(admin.users).toHaveBeenCalledWith({ page: 1, limit: 25 });
    await request(app.getHttpServer())
      .get("/api/v1/admin/users?page=2&limit=50")
      .set("Authorization", "Bearer test-admin")
      .expect(200);
    expect(admin.users).toHaveBeenLastCalledWith({ page: 2, limit: 50 });
    await request(app.getHttpServer())
      .get("/api/v1/admin/users?limit=101")
      .set("Authorization", "Bearer test-admin")
      .expect(400);
    for (const query of [
      "page=",
      "page=0",
      "page=1.5",
      "page=1e2",
      "page=1&page=2",
      "unexpected=1",
    ]) {
      await request(app.getHttpServer())
        .get(`/api/v1/admin/users?${query}`)
        .set("Authorization", "Bearer test-admin")
        .expect(400);
    }
  });

  it("returns safe array messages and rejects unknown request fields", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "bad", password: "DO_NOT_ECHO", admin: true })
      .expect(400);
    expect(response.body).toMatchObject({ statusCode: 400, error: "Bad Request" });
    expect(Array.isArray(response.body.message)).toBe(true);
    expect(JSON.stringify(response.body)).not.toContain("DO_NOT_ECHO");
    expect(response.body.errors).toBeUndefined();
    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: profile.email, password: "long-password", unexpected: true })
      .expect(400);
  });

  it("serializes populated JSON endpoints without changing their public shapes", async () => {
    for (const [path, expected] of [
      ["/users/me", profile],
      ["/subscriptions/me", subscription],
      ["/usage/me", usage],
      ["/admin/providers", providerList],
      ["/admin/dashboard", { users: 1, conversations: 1, searches: 0, requests: 0 }],
      ["/admin/users", adminUsers],
      ["/admin/subscriptions", adminSubscriptions],
      ["/admin/request-logs", requestLogs],
      ["/admin/health", systemHealth],
      ["/search/history", searchHistory],
      ["/search/recent", searchHistory],
    ] as const) {
      const response = await request(app.getHttpServer())
        .get(`/api/v1${path}`)
        .set("Authorization", "Bearer test-admin")
        .expect(200);
      expect(response.body).toEqual(expected);
    }
    const updated = await request(app.getHttpServer())
      .patch("/api/v1/users/me")
      .set("Authorization", "Bearer test-user")
      .send({ displayName: "Test" })
      .expect(200);
    expect(updated.body.role).toBe("USER");
    const upgraded = await request(app.getHttpServer())
      .patch("/api/v1/admin/users/1/subscription")
      .set("Authorization", "Bearer test-admin")
      .send({ plan: "PREMIUM" })
      .expect(200);
    expect(upgraded.body).toEqual({ ...subscription, plan: "PREMIUM" });
    const created = await request(app.getHttpServer())
      .post("/api/v1/admin/providers")
      .set("Authorization", "Bearer test-admin")
      .send({ name: "Test", type: "OPENAI", model: "mock-model", apiKey: "test-api-key" })
      .expect(201);
    expect(created.body).toEqual(provider);
    const providerHealth = await request(app.getHttpServer())
      .post("/api/v1/admin/providers/2/health")
      .set("Authorization", "Bearer test-admin")
      .expect(200);
    expect(providerHealth.body).toEqual({ status: "ok", latency: 1 });
    await request(app.getHttpServer()).get("/api/v1").expect(200, { message: "EchoGPT API" });
    const health = await request(app.getHttpServer()).get("/api/v1/health").expect(200);
    expect(health.body.status).toBe("ok");
  });

  it("strips private fields from profiles and fails closed on invalid service responses", async () => {
    users.findMe.mockImplementationOnce(() => ({
      ...profile,
      passwordHash: "private-hash",
    }));
    const response = await request(app.getHttpServer())
      .get("/api/v1/users/me")
      .set("Authorization", "Bearer test-user")
      .expect(200);
    expect(response.body).toEqual(profile);
    users.findMe.mockImplementationOnce(() => ({ ...profile, id: 0 }));
    const broken = await request(app.getHttpServer())
      .get("/api/v1/users/me")
      .set("Authorization", "Bearer test-user")
      .expect(500);
    expect(broken.body).toEqual({ statusCode: 500, message: "Internal Server Error" });
  });

  it("keeps request DTO validation and integer path parsing", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "invalid", password: "short" })
      .expect(400);
    await request(app.getHttpServer())
      .patch("/api/v1/admin/providers/2/enabled")
      .set("Authorization", "Bearer test-admin")
      .send({ enabled: "false" })
      .expect(400);
    await request(app.getHttpServer())
      .get("/api/v1/conversations/not-an-id/messages")
      .set("Authorization", "Bearer test-user")
      .expect(400);
    await request(app.getHttpServer())
      .patch("/api/v1/admin/providers/2/enabled")
      .set("Authorization", "Bearer test-admin")
      .send({ enabled: false })
      .expect(200);
    expect(providers.setEnabled).toHaveBeenCalledWith(2, { enabled: false });
  });

  it("passes search options using the existing API field names", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/search")
      .set("Authorization", "Bearer test-user")
      .send({ query: "NestJS", maximumTokens: 4096, safesearch: "off" })
      .expect(200);
    expect(search.search).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        query: "NestJS",
        maximumTokens: 4096,
        safesearch: "off",
      }),
    );
    await request(app.getHttpServer())
      .get("/api/v1/search/suggestions?q=nestjs")
      .set("Authorization", "Bearer test-user")
      .expect(200);
    expect(search.suggestions).toHaveBeenCalledWith(1, "nestjs");
  });

  it("serializes search responses and strips nested non-public fields", async () => {
    search.search.mockImplementationOnce(() => ({
      ...searchResult,
      internal: "private",
      sources: searchResult.sources.map((source) => ({ ...source, internal: "private" })),
    }));
    const response = await request(app.getHttpServer())
      .post("/api/v1/search")
      .set("Authorization", "Bearer test-user")
      .send({ query: "NestJS" })
      .expect(200);
    expect(response.body).toEqual(searchResult);
    for (const path of ["history", "recent"]) {
      const history = await request(app.getHttpServer())
        .get(`/api/v1/search/${path}`)
        .set("Authorization", "Bearer test-user")
        .expect(200);
      expect(history.body).toEqual(searchHistory);
    }
  });

  it("keeps conversation titles and the message-only chat envelope", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/conversations")
      .set("Authorization", "Bearer test-user")
      .send({ title: "  My   research  " })
      .expect(201);
    expect(created.body.title).toBe("My research");
    expect(chat.createConversation).toHaveBeenCalledWith(1, { title: "My research" });
    const sent = await request(app.getHttpServer())
      .post("/api/v1/chat/messages")
      .set("Authorization", "Bearer test-user")
      .send({ conversationId: 7, prompt: "Hello" })
      .expect(201);
    expect(Object.keys(sent.body)).toEqual(["message"]);
    expect(sent.body.message.sources).toEqual([]);
  });

  it("preserves empty 204 responses", async () => {
    const routes = [
      ["post", "/auth/logout", {}],
      [
        "patch",
        "/users/me/password",
        { currentPassword: "old-password", newPassword: "new-password" },
      ],
      ["delete", "/users/me", {}],
      ["delete", "/admin/providers/2", {}],
      ["delete", "/conversations/7", {}],
      ["delete", "/search/history", {}],
    ] as const;
    for (const [method, path, body] of routes) {
      const response = await request(app.getHttpServer())
        [method](`/api/v1${path}`)
        .set("Authorization", "Bearer test-admin")
        .send(body)
        .expect(204);
      expect(response.text).toBe("");
    }
    expect(users.changePassword).toHaveBeenCalledWith(1, {
      currentPassword: "old-password",
      newPassword: "new-password",
    });
  });

  it("retains useful Swagger documentation and uses the auth DTO schemas", async () => {
    const response = await request(app.getHttpServer()).get("/docs-json").expect(200);
    const doc = response.body;
    expect(doc.openapi).toBe("3.1.0");
    const resolveSchema = (schema: any): any =>
      schema.$ref ? doc.components.schemas[schema.$ref.split("/").at(-1)] : schema;
    for (const [path, item] of Object.entries(doc.paths) as Array<[string, Record<string, any>]>) {
      for (const operation of Object.values(item)) {
        expect(operation.summary).toBeTruthy();
        expect(operation.responses).toBeDefined();
        for (const [status, result] of Object.entries(operation.responses) as Array<
          [string, any]
        >) {
          if (!status.startsWith("2") || status === "204") continue;
          // The fixed root response intentionally has no DTO; its body is tested over HTTP.
          if (path.replace(/\/$/, "") === "/api/v1") continue;
          const schema = resolveSchema(result.content["application/json"].schema);
          expect(["object", "array"]).toContain(schema.type);
          if (schema.type === "object")
            expect(Object.keys(schema.properties).length).toBeGreaterThan(0);
        }
      }
    }
    const register = doc.paths["/api/v1/auth/register"].post;
    const reference = register.responses["201"].content["application/json"].schema.$ref;
    const authSchema = doc.components.schemas[reference.split("/").at(-1)];
    expect(Object.keys(authSchema.properties).sort()).toEqual([
      "accessToken",
      "refreshToken",
      "user",
    ]);
    expect(authSchema.properties.user.properties.displayName).toMatchObject({
      type: ["string", "null"],
    });
    expect(register.requestBody.content["application/json"].schema.$ref).toContain("RegisterDto");
    expect(
      doc.paths["/api/v1/admin/users"].get.parameters.map((p: { name: string }) => p.name).sort(),
    ).toEqual(["limit", "page"]);
    expect(
      doc.paths["/api/v1/admin/providers/{id}/enabled"].patch.requestBody.content[
        "application/json"
      ].schema.$ref,
    ).toContain("SetEnabledProviderDto");
    expect(doc.paths["/api/v1/admin/users"].get.security).toEqual([{ bearer: [] }]);
    for (const [path, method] of [
      ["/api/v1/admin/users/{id}/status", "patch"],
      ["/api/v1/admin/users/{id}/subscription", "patch"],
      ["/api/v1/admin/providers/{id}", "patch"],
      ["/api/v1/admin/providers/{id}", "delete"],
      ["/api/v1/admin/providers/{id}/enabled", "patch"],
      ["/api/v1/admin/providers/{id}/default", "put"],
      ["/api/v1/admin/providers/{id}/health", "post"],
      ["/api/v1/conversations/{id}/messages", "get"],
      ["/api/v1/conversations/{id}", "delete"],
    ]) {
      expect(doc.paths[path][method].parameters).toContainEqual(
        expect.objectContaining({
          name: "id",
          in: "path",
          required: true,
          schema: { type: "number" },
        }),
      );
    }
    const chatSchema = resolveSchema(
      doc.paths["/api/v1/chat/messages"].post.responses["201"].content["application/json"].schema,
    );
    expect(Object.keys(chatSchema.properties)).toEqual(["message"]);
    expect(chatSchema.properties.message.properties.sources.type).toBe("array");
    const conversations = resolveSchema(
      doc.paths["/api/v1/conversations"].get.responses["200"].content["application/json"].schema,
    );
    expect(conversations.type).toBe("array");
    expect(conversations.items.properties.title.type).toBe("string");
    const searchSchema = resolveSchema(
      doc.paths["/api/v1/search"].post.responses["200"].content["application/json"].schema,
    );
    expect(Object.keys(searchSchema.properties).sort()).toEqual(["query", "searchId", "sources"]);
    expect(Object.keys(searchSchema.properties.sources.items.properties).sort()).toEqual([
      "citation",
      "hostname",
      "publishedAt",
      "siteName",
      "snippets",
      "title",
      "url",
    ]);
    for (const path of ["history", "recent"]) {
      const historySchema = resolveSchema(
        doc.paths[`/api/v1/search/${path}`].get.responses["200"].content["application/json"].schema,
      );
      expect(historySchema.type).toBe("array");
      expect(Object.keys(historySchema.items.properties).sort()).toEqual([
        "createdAt",
        "id",
        "query",
      ]);
    }
    const suggestionsSchema = resolveSchema(
      doc.paths["/api/v1/search/suggestions"].get.responses["200"].content["application/json"]
        .schema,
    );
    expect(suggestionsSchema).toMatchObject({ type: "array", items: { type: "string" } });
    const checkNoExamples = (value: unknown) => {
      if (!value || typeof value !== "object") return;
      expect(Object.hasOwn(value, "example")).toBe(false);
      expect(Object.hasOwn(value, "examples")).toBe(false);
      for (const nested of Object.values(value)) checkNoExamples(nested);
    };
    checkNoExamples(doc);
    expect(doc.components.securitySchemes.bearer).toBeDefined();
  });
});
