import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { RoleSchema, UserStatusSchema } from "../../common/schemas/enums.schema";
import { IdSchema, TimestampSchema } from "../../common/schemas/primitives.schema";

export const ProfileResponseSchema = z.object({
  id: IdSchema,
  email: z.string(),
  displayName: z.string().nullable(),
  status: UserStatusSchema,
  createdAt: TimestampSchema,
  role: RoleSchema,
});

export class ProfileResponseDto extends createZodDto(ProfileResponseSchema) {}
