import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser } from "../common/current-user.decorator";
import { SubscriptionsService } from "./subscriptions.service";

@ApiTags("subscriptions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get("subscriptions/me")
  getSubscription(@CurrentUser() user: AuthUser) {
    return this.subscriptions.getSubscription(user.userId);
  }

  @Get("usage/me")
  getUsage(@CurrentUser() user: AuthUser) {
    return this.subscriptions.getUsage(user.userId);
  }
}
