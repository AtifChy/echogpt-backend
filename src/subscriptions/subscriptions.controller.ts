import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser } from "../common/current-user.decorator";
import { ApiNotFoundDocs, ApiUnauthorizedDocs } from "../common/swagger-errors";
import { SubscriptionResponseDto } from "./dto/subscription-response.dto";
import { SubscriptionsService } from "./subscriptions.service";
import { UsageResponseDto } from "./subscriptions.type";

@ApiTags("subscriptions")
@ApiBearerAuth()
@ApiUnauthorizedDocs()
@UseGuards(JwtAuthGuard)
@Controller()
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get("subscriptions/me")
  @ApiOperation({ summary: "Get the current user's subscription" })
  @ZodResponse({
    status: 200,
    type: SubscriptionResponseDto,
    description: "Current subscription",
  })
  @ApiNotFoundDocs("Subscription not found")
  getSubscription(@CurrentUser() user: AuthUser) {
    return this.subscriptions.getSubscription(user.userId);
  }

  @Get("usage/me")
  @ApiOperation({ summary: "Get the current user's request usage and remaining quota" })
  @ZodResponse({
    status: 200,
    type: UsageResponseDto,
    description: "Usage for the current subscription period",
  })
  @ApiNotFoundDocs("Subscription not found")
  getUsage(@CurrentUser() user: AuthUser) {
    return this.subscriptions.getUsage(user.userId);
  }
}
