import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const UpdateProviderSchema = z.strictObject({
  name: z
    .string()
    .min(1)
    .max(80)
    .nullable()
    .transform((value) => value ?? undefined)
    .optional(),
  model: z
    .string()
    .min(1)
    .max(100)
    .nullable()
    .transform((value) => value ?? undefined)
    .optional(),
  apiKey: z
    .string()
    .min(10)
    .nullable()
    .transform((value) => value ?? undefined)
    .optional()
    .meta({ writeOnly: true }),
});

export class UpdateProviderDto extends createZodDto(UpdateProviderSchema) {}
