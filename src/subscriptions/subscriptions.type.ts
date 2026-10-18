import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { SubscriptionPlanSchema, SubscriptionStatusSchema } from "../common/schemas/enums.schema";
import { CountSchema, TimestampSchema } from "../common/schemas/primitives.schema";
import type { Models } from "../prisma/contract";

type SubscriptionPlan = Models.public_Subscription["plan"];

export const PLAN_LIMITS: Record<SubscriptionPlan, number> = {
  FREE: 100,
  PREMIUM: 5_000,
} as const;

export const UsageResponseSchema = z.object({
  plan: SubscriptionPlanSchema,
  status: SubscriptionStatusSchema,
  limit: CountSchema,
  used: CountSchema,
  remaining: CountSchema,
  periodStart: TimestampSchema,
  periodEnd: TimestampSchema,
});

export class UsageResponseDto extends createZodDto(UsageResponseSchema) {}
