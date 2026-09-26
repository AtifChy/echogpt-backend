import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser } from "../common/current-user.decorator";
import { ApiNotFoundDocs, ApiUnauthorizedDocs } from "../common/swagger-errors";
import { SubscriptionsService } from "./subscriptions.service";

const subscriptionExample = {
  id: 1,
  userId: 1,
  plan: "FREE",
  status: "ACTIVE",
  currentPeriodStart: "2026-01-01T00:00:00.000Z",
  currentPeriodEnd: "2026-02-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

@ApiTags("subscriptions")
@ApiBearerAuth()
@ApiUnauthorizedDocs()
@UseGuards(JwtAuthGuard)
@Controller()
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get("subscriptions/me")
  @ApiOperation({ summary: "Get the current user's subscription" })
  @ApiOkResponse({
    description: "Current subscription",
    schema: { example: subscriptionExample },
  })
  @ApiNotFoundDocs("Subscription not found")
  getSubscription(@CurrentUser() user: AuthUser) {
    return this.subscriptions.getSubscription(user.userId);
  }

  @Get("usage/me")
  @ApiOperation({ summary: "Get the current user's request usage and remaining quota" })
  @ApiOkResponse({
    description: "Usage for the current subscription period",
    schema: {
      example: {
        plan: "FREE",
        status: "ACTIVE",
        limit: 100,
        used: 12,
        remaining: 88,
        periodStart: subscriptionExample.currentPeriodStart,
        periodEnd: subscriptionExample.currentPeriodEnd,
      },
    },
  })
  @ApiNotFoundDocs("Subscription not found")
  getUsage(@CurrentUser() user: AuthUser) {
    return this.subscriptions.getUsage(user.userId);
  }
}
