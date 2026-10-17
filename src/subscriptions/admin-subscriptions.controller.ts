import { Body, Controller, Param, ParseIntPipe, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import {
  ApiBadRequestDocs,
  ApiForbiddenDocs,
  ApiNotFoundDocs,
  ApiUnauthorizedDocs,
} from "../common/swagger-errors";
import { SubscriptionResponseDto } from "./dto/subscription-response.dto";
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
  @ZodResponse({
    status: 200,
    type: SubscriptionResponseDto,
    description: "Updated subscription",
  })
  @ApiBadRequestDocs()
  @ApiNotFoundDocs("Subscription not found")
  update(@Param("id", ParseIntPipe) userId: number, @Body() dto: UpdateSubscriptionDto) {
    return this.subscriptions.updateSubscription(userId, dto);
  }
}
