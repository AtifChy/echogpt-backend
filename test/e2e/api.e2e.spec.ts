import { randomUUID } from "node:crypto";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../../src/app.module";
import { configureApp } from "../../src/configure-app";
import { PrismaService } from "../../src/prisma.service";

describe("EchoGPT API", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken = "";
  let refreshToken = "";
  let userId = 0;
  let providerId = 0;

  const email = `e2e-${randomUUID()}@example.com`;
  const password = "correct-horse-battery-staple";
  const newPassword = "new-correct-horse-battery-staple";

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (!prisma || !app) return;

    if (providerId) {
      const provider = await prisma.db.orm.public.AiProvider.where({ id: providerId }).first();
      if (provider && !provider.isDefault) {
        await prisma.db.orm.public.AiProvider.where({ id: providerId }).delete();
      }
    }
    const user = await prisma.db.orm.public.User.where({ email }).first();
    if (user) await prisma.db.orm.public.User.where({ id: user.id }).delete();
    await app.close();
  });

  it("reports health", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/health").expect(200);
    expect(response.body).toMatchObject({ status: "ok" });
    expect(response.body.timestamp).toEqual(expect.any(String));
  });

  it("publishes OpenAPI JSON", async () => {
    const response = await request(app.getHttpServer()).get("/docs-json").expect(200);
    expect(response.body.info.title).toBe("EchoGPT API");
    expect(response.body.paths["/api/v1/auth/register"]).toBeDefined();
    expect(response.body.components.securitySchemes.bearer).toBeDefined();
  });

  it("rejects invalid and unknown registration fields", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "bad", password: "short", unexpected: true })
      .expect(400);
  });

  it("registers without exposing hashes", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email, password, displayName: "E2E User" })
      .expect(201);

    accessToken = response.body.accessToken;
    refreshToken = response.body.refreshToken;
    userId = response.body.user.id;
    expect(response.body.user).toMatchObject({ email, role: "USER" });
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
    expect(JSON.stringify(response.body)).not.toContain("tokenHash");
  });

  it("returns 409 for a normalized duplicate email", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: email.toUpperCase(), password })
      .expect(409);
  });

  it("does not reveal whether an email exists", async () => {
    const unknown = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: `unknown-${randomUUID()}@example.com`, password })
      .expect(401);
    const wrong = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password: `${password}-wrong` })
      .expect(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  it("requires authentication", async () => {
    await request(app.getHttpServer()).get("/api/v1/users/me").expect(401);
  });

  it("returns profile and FREE usage", async () => {
    const profile = await request(app.getHttpServer())
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    const usage = await request(app.getHttpServer())
      .get("/api/v1/usage/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(profile.body.email).toBe(email);
    expect(usage.body).toMatchObject({ plan: "FREE", limit: 100, used: 0, remaining: 100 });
  });

  it("updates the profile", async () => {
    const response = await request(app.getHttpServer())
      .patch("/api/v1/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ displayName: "Updated E2E User" })
      .expect(200);
    expect(response.body.displayName).toBe("Updated E2E User");
  });

  it("rotates refresh tokens and rejects reuse", async () => {
    const previous = refreshToken;
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: previous })
      .expect(200);
    accessToken = response.body.accessToken;
    refreshToken = response.body.refreshToken;
    expect(refreshToken).not.toBe(previous);
    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: previous })
      .expect(401);
  });

  it("revokes the session on logout", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(204);
    await request(app.getHttpServer())
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(401);
  });

  it("allows login after logout", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password })
      .expect(200);
    accessToken = response.body.accessToken;
    refreshToken = response.body.refreshToken;
  });

  it("returns 403 when USER calls an admin endpoint", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/admin/users?page=1&limit=25")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(403);
  });

  it("allows ADMIN and transforms pagination values", async () => {
    const adminRole = await prisma.db.orm.public.Role.where({ name: "ADMIN" }).first();
    if (!adminRole) throw new Error("ADMIN role was not seeded");
    await prisma.db.orm.public.User.where({ email }).update({ roleId: adminRole.id });

    const response = await request(app.getHttpServer())
      .get("/api/v1/admin/users?page=1&limit=25")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(response.body).toEqual(expect.any(Array));
    expect(response.body.some((user: { email: string }) => user.email === email)).toBe(true);
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
  });

  it("rejects invalid pagination", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/admin/users?page=0&limit=101")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(400);
  });

  it("serves the remaining admin read endpoints", async () => {
    for (const path of ["dashboard", "subscriptions", "request-logs", "health"]) {
      await request(app.getHttpServer())
        .get(`/api/v1/admin/${path}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
    }
  });

  it("upgrades a subscription and returns the PREMIUM limit", async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${userId}/subscription`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ plan: "PREMIUM", status: "ACTIVE" })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ userId, plan: "PREMIUM", status: "ACTIVE" });
      });

    await request(app.getHttpServer())
      .get("/api/v1/usage/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ plan: "PREMIUM", limit: 5_000 });
      });
  });

  it("creates, lists, updates, and removes a provider without exposing its key", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/admin/providers")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "E2E OpenAI",
        type: "OPENAI",
        model: "gpt-test",
        apiKey: "test-api-key-never-sent",
        enabled: false,
      })
      .expect(201);
    providerId = created.body.id;
    expect(created.body.hasApiKey).toBe(true);
    expect(JSON.stringify(created.body)).not.toContain("encryptedApiKey");
    expect(JSON.stringify(created.body)).not.toContain("test-api-key-never-sent");

    const list = await request(app.getHttpServer())
      .get("/api/v1/admin/providers")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(list.body.some((item: { id: number }) => item.id === providerId)).toBe(true);
    expect(JSON.stringify(list.body)).not.toContain("encryptedApiKey");

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/providers/${providerId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Updated E2E OpenAI", model: "gpt-test-2" })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ name: "Updated E2E OpenAI", model: "gpt-test-2" });
      });

    await request(app.getHttpServer())
      .delete(`/api/v1/admin/providers/${providerId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(204);
    providerId = 0;
  });

  it("changes the password, revokes sessions, and rejects the old password", async () => {
    await request(app.getHttpServer())
      .patch("/api/v1/users/me/password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ currentPassword: password, newPassword })
      .expect(204);

    await request(app.getHttpServer())
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(401);

    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password })
      .expect(401);

    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password: newPassword })
      .expect(200);
    accessToken = response.body.accessToken;
  });

  it("deletes the account and prevents future login", async () => {
    await request(app.getHttpServer())
      .delete("/api/v1/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password: newPassword })
      .expect(401);
  });
});
