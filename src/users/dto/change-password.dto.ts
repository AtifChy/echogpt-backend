import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const ChangePasswordSchema = z.strictObject({
  currentPassword: z.string().meta({ writeOnly: true }),
  newPassword: z.string().min(10).meta({ writeOnly: true }),
});

export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {}
