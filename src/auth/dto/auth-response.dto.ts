import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { RoleSchema } from "../../common/schemas/enums.schema";
import { IdSchema } from "../../common/schemas/primitives.schema";

export const AuthResponseUserSchema = z.object({
  id: IdSchema,
  email: z.string(),
  displayName: z.string().nullable().meta({ type: "string", nullable: true }),
  role: RoleSchema,
});

export const TokenPairSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

export const AuthResponseSchema = z.object({
  ...TokenPairSchema.shape,
  user: AuthResponseUserSchema,
});

export class AuthResponseDto extends createZodDto(AuthResponseSchema) {}
export class TokenPairResponseDto extends createZodDto(TokenPairSchema) {}
