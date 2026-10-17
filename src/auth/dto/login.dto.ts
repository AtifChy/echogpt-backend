import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const LoginSchema = z.strictObject({
  email: z.email(),
  password: z.string().meta({ writeOnly: true }),
});

export class LoginDto extends createZodDto(LoginSchema) {}
