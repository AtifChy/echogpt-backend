import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import {
  SubscriptionPlanSchema,
  SubscriptionStatusSchema,
} from "../../common/schemas/enums.schema";

export const UpdateSubscriptionSchema = z.strictObject({
  plan: SubscriptionPlanSchema,
  status: SubscriptionStatusSchema.nullish().transform((value) => value ?? undefined),
});

export class UpdateSubscriptionDto extends createZodDto(UpdateSubscriptionSchema) {}
