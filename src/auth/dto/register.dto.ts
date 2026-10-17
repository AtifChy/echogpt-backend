import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const RegisterSchema = z.strictObject({
  email: z.email(),
  password: z.string().min(10).meta({ writeOnly: true }),
  displayName: z
    .string()
    .min(1)
    .max(90)
    .nullish()
    .transform((value) => value ?? undefined),
});

export class RegisterDto extends createZodDto(RegisterSchema) {}
