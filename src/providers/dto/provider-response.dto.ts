import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { ProviderTypeSchema } from "../../common/schemas/enums.schema";
import { CountSchema, IdSchema, TimestampSchema } from "../../common/schemas/primitives.schema";

export const ProviderResponseSchema = z.object({
  id: IdSchema,
  name: z.string(),
  type: ProviderTypeSchema,
  model: z.string(),
  enabled: z.boolean(),
  isDefault: z.boolean(),
  hasApiKey: z.boolean(),
});

export class ProviderResponseDto extends createZodDto(ProviderResponseSchema) {}

export const ProviderListItemSchema = ProviderResponseSchema.omit({ hasApiKey: true }).extend({
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export class ProviderListResponseDto extends createZodDto(ProviderListItemSchema) {}
export class ProvidersResponseDto extends createZodDto(z.array(ProviderListItemSchema)) {}

export class ProviderHealthResponseDto extends createZodDto(
  z.object({
    status: z.literal("ok"),
    latency: CountSchema,
  }),
) {}
