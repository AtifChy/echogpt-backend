import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const UpdateProfileSchema = z.strictObject({
  displayName: z
    .string()
    .min(1)
    .max(80)
    .nullable()
    .transform((value) => value ?? undefined)
    .optional(),
});

export class UpdateProfileDto extends createZodDto(UpdateProfileSchema) {}
