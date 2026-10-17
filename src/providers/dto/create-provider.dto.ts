import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { ProviderTypeSchema } from "../../common/schemas/enums.schema";

export const CreateProviderSchema = z.strictObject({
  name: z.string().min(1).max(80),
  type: ProviderTypeSchema,
  model: z.string().min(1).max(100),
  apiKey: z.string().min(10).meta({ writeOnly: true }),
  enabled: z
    .boolean()
    .nullish()
    .transform((value) => value ?? undefined)
    .meta({ default: false }),
});

export class CreateProviderDto extends createZodDto(CreateProviderSchema) {}
