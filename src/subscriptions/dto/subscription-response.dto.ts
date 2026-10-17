import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import {
  SubscriptionPlanSchema,
  SubscriptionStatusSchema,
} from "../../common/schemas/enums.schema";
import { IdSchema, TimestampSchema } from "../../common/schemas/primitives.schema";

export const SubscriptionSummarySchema = z.object({
  plan: SubscriptionPlanSchema,
  status: SubscriptionStatusSchema,
  currentPeriodStart: TimestampSchema,
  currentPeriodEnd: TimestampSchema,
});

export const SubscriptionResponseSchema = SubscriptionSummarySchema.extend({
  id: IdSchema,
  userId: IdSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export class SubscriptionResponseDto extends createZodDto(SubscriptionResponseSchema) {}
