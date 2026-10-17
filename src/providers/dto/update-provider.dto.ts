import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const UpdateProviderSchema = z.strictObject({
  name: z
    .string()
    .min(1)
    .max(80)
    .nullish()
    .transform((value) => value ?? undefined),
  model: z
    .string()
    .min(1)
    .max(100)
    .nullish()
    .transform((value) => value ?? undefined),
  apiKey: z
    .string()
    .min(10)
    .nullish()
    .transform((value) => value ?? undefined)
    .meta({ writeOnly: true }),
});

export class UpdateProviderDto extends createZodDto(UpdateProviderSchema) {}
