import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException } from "@nestjs/common";

import type { AuthUser } from "../../src/common/auth-user";
import { RolesGuard } from "../../src/common/roles.guard";
import { SecretCipherService } from "../../src/providers/secret-cipher.service";

const TEST_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

function contextFor(role: AuthUser["role"]): ExecutionContext {
  return {
    getHandler: () => contextFor,
    getClass: () => RolesGuard,
    switchToHttp: () => ({
      getRequest: () => ({ user: { userId: 1, sessionId: 1, role } }),
    }),
  } as unknown as ExecutionContext;
}

describe("RolesGuard", () => {
  it("allows a route without role metadata", () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(undefined) };
    expect(new RolesGuard(reflector as never).canActivate(contextFor("USER"))).toBe(true);
  });

  it("allows ADMIN on an admin route", () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(["ADMIN"]) };
    expect(new RolesGuard(reflector as never).canActivate(contextFor("ADMIN"))).toBe(true);
  });

  it("rejects USER on an admin route", () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(["ADMIN"]) };
    const guard = new RolesGuard(reflector as never);
    expect(() => guard.canActivate(contextFor("USER"))).toThrow(ForbiddenException);
  });
});

describe("SecretCipherService", () => {
  const config = { getOrThrow: vi.fn().mockReturnValue(TEST_KEY) };

  it("round-trips an API key without storing plaintext", () => {
    const cipher = new SecretCipherService(config as never);
    const secret = cipher.encrypt("sk-test-secret");
    expect(cipher.decrypt(secret)).toBe("sk-test-secret");
    expect(secret.encryptedApiKey).not.toContain("sk-test-secret");
  });

  it("uses a fresh IV for every encryption", () => {
    const cipher = new SecretCipherService(config as never);
    expect(cipher.encrypt("same").apiKeyIv).not.toBe(cipher.encrypt("same").apiKeyIv);
  });

  it("rejects keys that are not 32 bytes", () => {
    const badConfig = {
      getOrThrow: vi.fn().mockReturnValue(Buffer.from("short").toString("base64")),
    };
    expect(() => new SecretCipherService(badConfig as never)).toThrow("base64-encoded 32-byte key");
  });

  it("rejects a modified authentication tag", () => {
    const cipher = new SecretCipherService(config as never);
    const secret = cipher.encrypt("sk-test-secret");
    expect(() =>
      cipher.decrypt({ ...secret, apiKeyAuthTag: Buffer.alloc(16).toString("base64") }),
    ).toThrow();
  });
});
