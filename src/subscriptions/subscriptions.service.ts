import { HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma.service";
import type { UpdateSubscriptionDto } from "./dto/update-subscription.dto";
import { PLAN_LIMITS, type SubscriptionUsageResponse } from "./subscriptions.type";

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSubscription(userId: number) {
    const subscription = await this.prisma.db.orm.public.Subscription.where({ userId }).first();
    if (!subscription) throw new NotFoundException("Subscription not found");
    return subscription;
  }

  async getUsage(userId: number): Promise<SubscriptionUsageResponse> {
    const subscription = await this.getSubscription(userId);
    const plan = subscription.plan;
    const limit = PLAN_LIMITS[plan];
    if (!limit) throw new Error(`Unsupported plan: ${subscription.plan}`);

    const result = await this.prisma.db.orm.public.ApiUsageLog.where({ userId, status: "SUCCESS" })
      .where((log) => log.createdAt.gte(subscription.currentPeriodStart))
      .where((log) => log.createdAt.lt(subscription.currentPeriodEnd))
      .aggregate((agg) => ({ used: agg.count() }));

    return {
      plan,
      status: subscription.status as SubscriptionUsageResponse["status"],
      limit,
      used: result.used,
      remaining: Math.max(limit - result.used, 0),
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
    };
  }

  async assertAvailable(userId: number, required = 1) {
    const usage = await this.getUsage(userId);
    if (usage.status !== "ACTIVE" || usage.remaining < required) {
      throw new HttpException("Request limit reached", HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async updateSubscription(userId: number, dto: UpdateSubscriptionDto) {
    const subscription = await this.getSubscription(userId);
    await this.prisma.db.orm.public.Subscription.where({ id: subscription.id }).update({
      plan: dto.plan,
      status: dto.status ?? subscription.status,
    });
    return this.getSubscription(userId);
  }
}
