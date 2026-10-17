import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { RoleSchema, UserStatusSchema } from "../../common/schemas/enums.schema";
import { IdSchema, TimestampSchema } from "../../common/schemas/primitives.schema";

export const ProfileResponseSchema = z.object({
  id: IdSchema,
  email: z.string(),
  displayName: z.string().nullable().meta({ type: "string", nullable: true }),
  status: UserStatusSchema,
  createdAt: TimestampSchema,
  role: z.object({ name: RoleSchema }),
});

export class ProfileResponseDto extends createZodDto(ProfileResponseSchema) {}
