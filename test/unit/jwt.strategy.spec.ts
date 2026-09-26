import { UnauthorizedException } from "@nestjs/common";
import { vi } from "vitest";

import { JwtStrategy } from "../../src/auth/jwt.strategy";

function fixture(session: unknown) {
  const first = vi.fn().mockReturnValue(session);
  const include = vi.fn().mockReturnValue({ first });
  const where = vi.fn().mockReturnValue({ include });
  const prisma = { db: { orm: { public: { Session: { where } } } } };
  const config = {
    getOrThrow: vi.fn().mockReturnValue("test-only-jwt-secret-at-least-32-characters"),
  };
  return { strategy: new JwtStrategy(config as never, prisma as never), where };
}

const activeSession = {
  id: 7,
  userId: 3,
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  user: { status: "ACTIVE", role: { name: "USER" } },
};

describe("JwtStrategy", () => {
  it("returns AuthUser for an active session", async () => {
    const { strategy, where } = fixture(activeSession);
    await expect(strategy.validate({ sub: 3, sid: 7 })).resolves.toEqual({
      userId: 3,
      sessionId: 7,
      role: "USER",
    });
    expect(where).toHaveBeenCalledWith({ id: 7, userId: 3, revokedAt: null });
  });

  it.each([
    ["missing", null],
    ["suspended", { ...activeSession, user: { ...activeSession.user, status: "SUSPENDED" } }],
    ["expired", { ...activeSession, expiresAt: new Date(Date.now() - 1_000).toISOString() }],
  ])("rejects a %s session", async (_label, session) => {
    const { strategy } = fixture(session);
    await expect(strategy.validate({ sub: 3, sid: 7 })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
