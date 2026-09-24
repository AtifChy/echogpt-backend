import { Body, Controller, Param, ParseIntPipe, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { UpdateSubscriptionDto } from "./dto/update-subscription.dto";
import { SubscriptionsService } from "./subscriptions.service";

@ApiTags("admin")
@ApiBearerAuth()
@Roles("ADMIN")
@UseGuards(AuthGuard, RolesGuard)
@Controller("admin/users")
export class AdminSubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  // Update a user's subscription plan and status
  @Patch(":id/subscription")
  update(@Param("id", ParseIntPipe) userId: number, @Body() dto: UpdateSubscriptionDto) {
    return this.subscriptions.updateSubscription(userId, dto);
  }
}
