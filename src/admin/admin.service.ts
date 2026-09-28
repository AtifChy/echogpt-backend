import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma.service";
import type { Models } from "../prisma/contract";
import type { PaginationDto } from "./dto/pagination.dto";

type UserStatus = Models.public_User["status"];

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const [users, conversations, searches, requests] = await Promise.all([
      this.prisma.db.orm.public.User.aggregate((a) => ({ count: a.count() })),
      this.prisma.db.orm.public.Conversation.aggregate((a) => ({ count: a.count() })),
      this.prisma.db.orm.public.WebSearch.aggregate((a) => ({ count: a.count() })),
      this.prisma.db.orm.public.ApiUsageLog.aggregate((a) => ({ count: a.count() })),
    ]);
    return {
      users: users.count,
      conversations: conversations.count,
      searches: searches.count,
      requests: requests.count,
    };
  }

  users(query: PaginationDto) {
    return this.prisma.db.orm.public.User.select(
      "id",
      "email",
      "displayName",
      "status",
      "createdAt",
      "updatedAt",
    )
      .include("role", (role) => role.select("name"))
      .include("subscriptions", (subscription) =>
        subscription.select("plan", "status", "currentPeriodStart", "currentPeriodEnd"),
      )
      .orderBy((user) => user.createdAt.desc())
      .offset((query.page - 1) * query.limit)
      .limit(query.limit)
      .all();
  }

  async updateUserStatus(userId: number, status: UserStatus) {
    const user = await this.prisma.db.orm.public.User.where({ id: userId }).first();
    if (!user) throw new NotFoundException("User not found");
    await this.prisma.db.transaction(async (tx) => {
      await tx.orm.public.User.where({ id: userId }).update({ status });
      if (status === "SUSPENDED") {
        await tx.orm.public.Session.where({ userId }).updateAll({
          revokedAt: new Date().toISOString(),
        });
      }
    });
    return { id: userId, status };
  }

  subscriptions(query: PaginationDto) {
    return this.prisma.db.orm.public.Subscription.select(
      "id",
      "userId",
      "plan",
      "status",
      "currentPeriodStart",
      "currentPeriodEnd",
    )
      .include("user", (user) => user.select("email", "displayName"))
      .orderBy((subscription) => subscription.createdAt.desc())
      .offset((query.page - 1) * query.limit)
      .limit(query.limit)
      .all();
  }

  usage(query: PaginationDto) {
    return this.prisma.db.orm.public.ApiUsageLog.select(
      "id",
      "userId",
      "providerId",
      "operation",
      "status",
      "inputTokens",
      "outputTokens",
      "latencyMs",
      "createdAt",
    )
      .orderBy((log) => log.createdAt.desc())
      .offset((query.page - 1) * query.limit)
      .limit(query.limit)
      .all();
  }

  async requestLogs(query: PaginationDto) {
    const logs = await this.usage(query);
    return logs.map((log) => ({
      requestId: log.id,
      userId: log.userId,
      providerId: log.providerId,
      operation: log.operation,
      status: log.status,
      latencyMs: log.latencyMs,
      createdAt: log.createdAt,
    }));
  }

  async health() {
    const startedAt = Date.now();
    await this.prisma.db.orm.public.Role.select("id").limit(1).all();
    return {
      status: "ok",
      database: "up",
      databaseLatencyMs: Date.now() - startedAt,
      uptimeSeconds: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  }
}
