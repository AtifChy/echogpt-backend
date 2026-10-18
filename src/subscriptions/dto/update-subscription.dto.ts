import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import {
  SubscriptionPlanSchema,
  SubscriptionStatusSchema,
} from "../../common/schemas/enums.schema";

export const UpdateSubscriptionSchema = z.strictObject({
  plan: SubscriptionPlanSchema,
  status: SubscriptionStatusSchema.nullable()
    .transform((value) => value ?? undefined)
    .optional(),
});

export class UpdateSubscriptionDto extends createZodDto(UpdateSubscriptionSchema) {}
