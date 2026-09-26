import { Body, Controller, Param, ParseIntPipe, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import {
  ApiBadRequestDocs,
  ApiForbiddenDocs,
  ApiNotFoundDocs,
  ApiUnauthorizedDocs,
} from "../common/swagger-errors";
import { UpdateSubscriptionDto } from "./dto/update-subscription.dto";
import { SubscriptionsService } from "./subscriptions.service";

@ApiTags("admin")
@ApiBearerAuth()
@ApiUnauthorizedDocs()
@ApiForbiddenDocs()
@Roles("ADMIN")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("admin/users")
export class AdminSubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Patch(":id/subscription")
  @ApiOperation({ summary: "Update a user's subscription" })
  @ApiParam({ name: "id", type: Number, description: "User ID" })
  @ApiOkResponse({
    description: "Updated subscription",
    schema: {
      example: {
        id: 1,
        userId: 1,
        plan: "PREMIUM",
        status: "ACTIVE",
        currentPeriodStart: "2026-01-01T00:00:00.000Z",
        currentPeriodEnd: "2026-02-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
    },
  })
  @ApiBadRequestDocs()
  @ApiNotFoundDocs("Subscription not found")
  update(@Param("id", ParseIntPipe) userId: number, @Body() dto: UpdateSubscriptionDto) {
    return this.subscriptions.updateSubscription(userId, dto);
  }
}
