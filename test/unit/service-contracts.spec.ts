import { describe, expect, it, vi } from "bun:test";

import { AdminService } from "../../src/admin/admin.service";
import { AdminUsersResponseDto } from "../../src/admin/dto/admin-response.dto";
import { ChatService } from "../../src/chat/chat.service";
import { CreateConversationSchema } from "../../src/chat/dto/create-conversation.dto";
import { UpdateSubscriptionSchema } from "../../src/subscriptions/dto/update-subscription.dto";
import { SubscriptionsService } from "../../src/subscriptions/subscriptions.service";
import { ProfileResponseSchema } from "../../src/users/dto/profile-response.dto";
import { UpdateProfileSchema } from "../../src/users/dto/update-profile.dto";
import { UserService } from "../../src/users/users.service";

const profile = {
  id: 1,
  email: "user@example.com",
  displayName: null,
  status: "ACTIVE" as const,
  createdAt: "2026-10-17 19:44:26.77117+00",
  role: "USER" as const,
};

describe("Service response contracts", () => {
  it.each(["USER", "ADMIN"] as const)(
    "maps admin user role %s to a string and preserves nullable subscriptions",
    async (role) => {
      const rows = [
        { ...profile, role: { name: role }, updatedAt: profile.createdAt, subscriptions: null },
      ];
      const expected = [{ ...profile, role, updatedAt: profile.createdAt, subscriptions: null }];
      const query = {
        include: vi.fn(),
        orderBy: vi.fn(),
        offset: vi.fn(),
        limit: vi.fn(),
        all: vi.fn().mockResolvedValue(rows),
      };
      for (const method of [query.include, query.orderBy, query.offset, query.limit]) {
        method.mockReturnValue(query);
      }
      const prisma = { db: { orm: { public: { User: { select: vi.fn(() => query) } } } } };
      const result = await new AdminService(prisma as never).users({ page: 2, limit: 25 });
      expect(result).toEqual(expected);
      expect(AdminUsersResponseDto.schema.parse(result)).toEqual(expected);
      expect(query.offset).toHaveBeenCalledWith(25);
      expect(query.limit).toHaveBeenCalledWith(25);
    },
  );

  it.each(["USER", "ADMIN"] as const)(
    "maps profile role %s to a string without a controller mock",
    async (role) => {
      const query = {
        select: vi.fn(),
        include: vi.fn(),
        first: vi.fn().mockResolvedValue({ ...profile, role: { name: role } }),
      };
      query.select.mockReturnValue(query);
      query.include.mockReturnValue(query);
      const prisma = { db: { orm: { public: { User: { where: vi.fn(() => query) } } } } };
      const result = await new UserService(prisma as never).findMe(1);
      expect(result).toEqual({ ...profile, role });
      expect(ProfileResponseSchema.parse(result)).toEqual({ ...profile, role });
    },
  );

  it.each([{}, { displayName: null }])("preserves profile clearing for %j", async (dto) => {
    const update = vi.fn().mockResolvedValue(undefined);
    const prisma = { db: { orm: { public: { User: { where: vi.fn(() => ({ update })) } } } } };
    const service = new UserService(prisma as never);
    vi.spyOn(service, "findMe").mockResolvedValue(profile);
    expect(await service.updateProfile(1, UpdateProfileSchema.parse(dto))).toEqual(profile);
    expect(update).toHaveBeenCalledWith({ displayName: null });
  });

  it("uses the default provider and title for null conversation options", async () => {
    const create = vi.fn().mockResolvedValue({ id: 1 });
    const prisma = { db: { orm: { public: { Conversation: { create } } } } };
    const providers = { resolveId: vi.fn().mockResolvedValue(2) };
    const service = new ChatService(prisma as never, providers as never, {} as never, {} as never);
    await service.createConversation(
      1,
      CreateConversationSchema.parse({ providerId: null, title: null }),
    );
    expect(providers.resolveId).toHaveBeenCalledWith(undefined);
    expect(create).toHaveBeenCalledWith({ userId: 1, providerId: 2, title: "New Conversation" });
  });

  it("retains subscription status when the optional update status is null", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const prisma = {
      db: { orm: { public: { Subscription: { where: vi.fn(() => ({ update })) } } } },
    };
    const service = new SubscriptionsService(prisma as never);
    vi.spyOn(service, "getSubscription").mockResolvedValue({
      id: 1,
      userId: 1,
      plan: "FREE",
      status: "ACTIVE",
      currentPeriodStart: profile.createdAt,
      currentPeriodEnd: profile.createdAt,
      createdAt: profile.createdAt,
      updatedAt: profile.createdAt,
    });
    await service.updateSubscription(
      1,
      UpdateSubscriptionSchema.parse({ plan: "PREMIUM", status: null }),
    );
    expect(update).toHaveBeenCalledWith({ plan: "PREMIUM", status: "ACTIVE" });
  });
});
