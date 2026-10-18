import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { UserStatusSchema } from "../../common/schemas/enums.schema";

export const UpdateUserStatusSchema = z.strictObject({
  status: UserStatusSchema,
});

export class UpdateUserStatusDto extends createZodDto(UpdateUserStatusSchema) {}
