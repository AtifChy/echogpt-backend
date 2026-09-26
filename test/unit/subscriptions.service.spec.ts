import { HttpException } from "@nestjs/common";

import { SubscriptionsService } from "../../src/subscriptions/subscriptions.service";

function fixture(used: number) {
  const aggregate = vi.fn().mockResolvedValue({ used });
  const query: { where: ReturnType<typeof vi.fn>; aggregate: typeof aggregate } = {
    where: vi.fn(),
    aggregate,
  };
  query.where.mockReturnValue(query);
  const usageWhere = vi.fn().mockReturnValue(query);
  const prisma = {
    db: { orm: { public: { ApiUsageLog: { where: usageWhere } } } },
  };
  return { service: new SubscriptionsService(prisma as never), usageWhere };
}

const period = {
  currentPeriodStart: "2026-09-01T00:00:00.000Z",
  currentPeriodEnd: "2026-10-01T00:00:00.000Z",
};

describe("SubscriptionsService", () => {
  it.each([
    ["FREE", 100, 40, 60],
    ["PREMIUM", 5_000, 40, 4_960],
    ["FREE", 100, 120, 0],
  ] as const)("calculates %s usage", async (plan, limit, used, remaining) => {
    const { service, usageWhere } = fixture(used);
    vi.spyOn(service, "getSubscription").mockResolvedValue({
      plan,
      status: "ACTIVE",
      ...period,
    } as never);

    await expect(service.getUsage(9)).resolves.toMatchObject({
      plan,
      limit,
      used,
      remaining,
    });
    expect(usageWhere).toHaveBeenCalledWith({ userId: 9, status: "SUCCESS" });
  });

  it("rejects requests when quota is exhausted", async () => {
    const { service } = fixture(0);
    vi.spyOn(service, "getUsage").mockResolvedValue({
      plan: "FREE",
      status: "ACTIVE",
      limit: 100,
      used: 100,
      remaining: 0,
      periodStart: period.currentPeriodStart,
      periodEnd: period.currentPeriodEnd,
    });
    await expect(service.assertAvailable(9)).rejects.toBeInstanceOf(HttpException);
  });

  it("charges two units for a grounded chat", async () => {
    const { service } = fixture(0);
    vi.spyOn(service, "getUsage").mockResolvedValue({
      plan: "FREE",
      status: "ACTIVE",
      limit: 100,
      used: 99,
      remaining: 1,
      periodStart: period.currentPeriodStart,
      periodEnd: period.currentPeriodEnd,
    });
    await expect(service.assertAvailable(9, 2)).rejects.toBeInstanceOf(HttpException);
  });
});
