import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { UserStatusSchema } from "../../common/schemas/enums.schema";
import { IdSchema, TimestampSchema } from "../../common/schemas/primitives.schema";
import { SubscriptionSummarySchema } from "../../subscriptions/dto/subscription-response.dto";
import { ProfileResponseSchema } from "../../users/dto/profile-response.dto";

export const AdminUserResponseSchema = ProfileResponseSchema.extend({
  updatedAt: TimestampSchema,
  subscriptions: SubscriptionSummarySchema.nullable(),
});

export class AdminUserResponseDto extends createZodDto(AdminUserResponseSchema) {}
export class AdminUsersResponseDto extends createZodDto(z.array(AdminUserResponseSchema)) {}

export class UpdatedUserStatusResponseDto extends createZodDto(
  z.object({
    id: IdSchema,
    status: UserStatusSchema,
  }),
) {}

export class AdminSubscriptionResponseDto extends createZodDto(
  SubscriptionSummarySchema.extend({
    id: IdSchema,
    userId: IdSchema,
    user: z.object({ email: z.string(), displayName: z.string().nullable() }),
  }),
) {}

export class AdminSubscriptionsResponseDto extends createZodDto(
  z.array(AdminSubscriptionResponseDto.schema),
) {}
